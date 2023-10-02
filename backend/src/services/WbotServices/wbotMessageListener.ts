import { join } from "path";
import { promisify } from "util";
import { writeFile } from "fs";
import dotenv from "dotenv";
import * as Sentry from "@sentry/node";

import ListSettingsServiceOne from "../SettingServices/ListSettingsServiceOne";
import Settings from "../../models/Setting";

import {
  Contact as WbotContact,
  Message as WbotMessage,
  MessageAck,
  Client
} from "whatsapp-web.js";

import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";

import { getIO } from "../../libs/socket";
import CreateMessageService from "../MessageServices/CreateMessageService";
import { logger } from "../../utils/logger";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import { debounce } from "../../helpers/Debounce";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import CreateContactService from "../ContactServices/CreateContactService";
import GetContactService from "../ContactServices/GetContactService";
import formatBody from "../../helpers/Mustache";
import { Op } from "sequelize";
const axios = require('axios')

interface Session extends Client {
  id?: number;
}

dotenv.config();

const writeFileAsync = promisify(writeFile);

const verifyContact = async (msgContact: WbotContact): Promise<Contact> => {
  /* const profilePicUrl = await msgContact.getProfilePicUrl();

  const contactData = {
    name: msgContact.name || msgContact.pushname || msgContact.id.user,
    number: msgContact.id.user,
    profilePicUrl,
    isGroup: msgContact.isGroup
  };

  const contact = CreateOrUpdateContactService(contactData);

  return contact;
}; */

try {
  const profilePicUrl = await msgContact.getProfilePicUrl();
  const contactData = {
      name: msgContact.name || msgContact.pushname || msgContact.id.user,
      number: msgContact.id.user,
      profilePicUrl,
      isGroup: msgContact.isGroup
  };
  const contact = CreateOrUpdateContactService(contactData);
  return contact;
}
catch (err: any) {
  const profilePicUrl = "/default-profile.png"; // Foto de perfil padrão
  const contactData = {
      name: msgContact.name || msgContact.pushname || msgContact.id.user,
      number: msgContact.id.user,
      profilePicUrl,
      isGroup: msgContact.isGroup
  };
  const contact = CreateOrUpdateContactService(contactData);
  return contact;
}};


const verifyQuotedMessage = async (
  msg: WbotMessage
): Promise<Message | null> => {
  if (!msg.hasQuotedMsg) return null;

  const wbotQuotedMsg = await msg.getQuotedMessage();

  const quotedMsg = await Message.findOne({
    where: { id: wbotQuotedMsg.id.id }
  });

  if (!quotedMsg) return null;

  return quotedMsg;
};

const verifyMediaMessage = async (
  msg: WbotMessage,
  ticket: Ticket,
  contact: Contact
): Promise<Message> => {
  const quotedMsg = await verifyQuotedMessage(msg);

  const media = await msg.downloadMedia();

  if (!media) {
    throw new Error("ERR_WAPP_DOWNLOAD_MEDIA");
  }

/* Check if media not have a filename
  if (!media.filename) {
    const ext = media.mimetype.split("/")[1].split(";")[0];
    media.filename = `${new Date().getTime()}.${ext}`;
  }
*/
let originalFilename = media.filename ? `-${media.filename}` : ''
// Always write a random filename
const ext = media.mimetype.split("/")[1].split(";")[0];
media.filename = `${new Date().getTime()}${originalFilename}.${ext}`;

  try {
    await writeFileAsync(
      join(__dirname, "..", "..", "..", "public", media.filename),
      media.data,
      "base64"
    );



  } catch (err: any) {
    Sentry.captureException(err);
    logger.error(err);
  }

  const messageData = {
    id: msg.id.id,
    ticketId: ticket.id,
    contactId: msg.fromMe ? undefined : contact.id,
    body: msg.body || media.filename,
    fromMe: msg.fromMe,
    read: msg.fromMe,
    mediaUrl: media.filename,
    mediaType: media.mimetype.split("/")[0],
    quotedMsgId: quotedMsg == null || quotedMsg == void 0 ? void 0 : quotedMsg.id
  };

  await ticket.update({ lastMessage: msg.body || media.filename });
  const newMessage = await CreateMessageService({ messageData });

  return newMessage;
};

const verifyMessage = async (
  msg: WbotMessage,
  ticket: Ticket,
  contact: Contact
) => {

  if (msg.type === 'location')
    msg = prepareLocation(msg);

  const quotedMsg = await verifyQuotedMessage(msg);
  const messageData = {
    id: msg.id.id,
    ticketId: ticket.id,
    contactId: msg.fromMe ? undefined : contact.id,
    body: msg.body,
    fromMe: msg.fromMe,
    mediaType: msg.type,
    read: msg.fromMe,
    quotedMsgId: quotedMsg?.id
  };

  await ticket.update({ lastMessage: msg.type === "location" ? msg.location.description ? "Localization - " + msg.location.description.split('\\n')[0] : "Localization" : msg.body });

  await CreateMessageService({ messageData });
};

const prepareLocation = (msg: WbotMessage): WbotMessage => {
  let gmapsUrl = "https://maps.google.com/maps?q=" + msg.location.latitude + "%2C" + msg.location.longitude + "&z=17&hl=pt-BR";

  msg.body = "data:image/png;base64," + msg.body + "|" + gmapsUrl;

  msg.body += "|" + (msg.location.description ? msg.location.description : (msg.location.latitude + ", " + msg.location.longitude))

  return msg;
};

const verifyQueue = async (
  wbot: Session,
  msg: WbotMessage,
  ticket: Ticket,
  contact: Contact
) => {
  const { queues, greetingMessage } = await ShowWhatsAppService(wbot.id!);

  if (queues.length === 1) {
    await UpdateTicketService({
      ticketData: { queueId: queues[0].id },
      ticketId: ticket.id
    });

    return;
  }

  const selectedOption = msg.body;

  const choosenQueue = queues[+selectedOption - 1];

  if (choosenQueue) {
    await UpdateTicketService({
      ticketData: { queueId: choosenQueue.id },
      ticketId: ticket.id
    });

    const body = formatBody(`\u200e${choosenQueue.greetingMessage}`, contact);

    const sentMessage = await wbot.sendMessage(`${contact.number}@c.us`, body);

    await verifyMessage(sentMessage, ticket, contact);
  } else {
    let options = "";

    queues.forEach((queue, index) => {
      options += `*${index + 1}* - ${queue.name}\n`;
    });

    const body = formatBody(`\u200e${greetingMessage}\n${options}`, contact);

    const debouncedSentMessage = debounce(
      async () => {
        const sentMessage = await wbot.sendMessage(
          `${contact.number}@c.us`,
          body
        );
        verifyMessage(sentMessage, ticket, contact);
      },
      3000,
      ticket.id
    );

    debouncedSentMessage();
  }
};

const isValidMsg = (msg: WbotMessage): boolean => {
  if (msg.from === "status@broadcast") return false;

  if (
    msg.type === "chat" ||
    msg.type === "audio" ||
    msg.type === "call_log" ||
    msg.type === "ptt" ||
    msg.type === "video" ||
    msg.type === "image" ||
    msg.type === "document" ||
    msg.type === "vcard" ||
    //msg.type === "multi_vcard" ||
    msg.type === "sticker" ||
    msg.type === "e2e_notification" || // Ignore Empty Messages Generated When Someone Changes His Account from Personal to Business or vice-versa
    msg.type === "notification_template" || // Ignore Empty Messages Generated When Someone Changes His Account from Personal to Business or vice-versa
    msg.author != null || // Ignore Group Messages
    msg.type === "location"
  )
    return true;
  return false;
};

const handleMessage = async (
  msg: WbotMessage,
  wbot: Session
): Promise<void> => {
  if (!isValidMsg(msg)) {
    return;
  }

  // Ignorar Mensagens de Grupo
	const Settingdb = await Settings.findOne({
	  where: { key: 'CheckMsgIsGroup' }
	});
	if(Settingdb?.value == 'enabled') {
		if (
		msg.from === "status@broadcast" ||
    msg.type === "e2e_notification" ||
    msg.type === "notification_template" ||
		msg.author != null
		) {
			return;
		}
	}

  try {
    let msgContact: WbotContact;
    let groupContact: Contact | undefined;

    if (msg.fromMe) {
      // messages sent automatically by wbot have a special character in front of it
      // if so, this message was already been stored in database;
      if (/\u200e/.test(msg.body[0])) return;

      // media messages sent from me from cell phone, first comes with "hasMedia = false" and type = "image/ptt/etc"
      // in this case, return and let this message be handled by "media_uploaded" event, when it will have "hasMedia = true"

      if (!msg.hasMedia && msg.type !== "location" && msg.type !== "chat" && msg.type !== "vcard"
        //&& msg.type !== "multi_vcard"
      ) return;

      msgContact = await wbot.getContactById(msg.to);
    } else {

      // Verifica se Cliente fez ligação/vídeo pelo wpp
      const listSettingsService = await ListSettingsServiceOne({key: "call"});
      var callSetting = listSettingsService?.value;

      msgContact = await msg.getContact();

    }

    const chat = await msg.getChat();

    if (chat.isGroup) {
      let msgGroupContact;

      if (msg.fromMe) {
        msgGroupContact = await wbot.getContactById(msg.to);
      } else {
        msgGroupContact = await wbot.getContactById(msg.from);
      }

      groupContact = await verifyContact(msgGroupContact);
    }
    const whatsapp = await ShowWhatsAppService(wbot.id!);

    const unreadMessages = msg.fromMe ? 0 : chat.unreadCount;

    const contact = await verifyContact(msgContact);

    if (
      unreadMessages === 0 &&
      whatsapp.farewellMessage &&
      formatBody(whatsapp.farewellMessage, contact) === msg.body
    )
      return;

   	//SETA SE A MENSAGEM E DE ENTRADA (in) OU DE SAIDA (out)
    const direction = msg.fromMe

    //console.log(quotedMsg)


    /*const ticket = await FindOrCreateTicketService(
      contact,
      wbot.id!,
      unreadMessages,
      groupContact
    );*/

    let ticket: Ticket;
    let findticket = await Ticket.findOne({
      where: {
        status: {
          [Op.or]: ["open", "pending"]
        },
        contactId: groupContact ? groupContact.id : contact.id
      }
    });
    if (!findticket && msg.fromMe) {
      logger.error("Whatsapp message sent outside whaticket app");
      return;
    } else {
      ticket = await FindOrCreateTicketService(
        contact,
        wbot.id!,
        unreadMessages,
        groupContact
      );
    }

    if (msg.hasMedia) {
      await verifyMediaMessage(msg, ticket, contact);
    } else {
      await verifyMessage(msg, ticket, contact);
    }

    if (
      !ticket.queue &&
      !chat.isGroup &&
      !msg.fromMe &&
      !ticket.userId &&
      whatsapp.queues.length >= 1
    ) {
      await verifyQueue(wbot, msg, ticket, contact);
    }

    if (msg.type === "vcard") {
      try {
        const array = msg.body.split("\n");
        const obj = [];
        let contact = "";
        for (let index = 0; index < array.length; index++) {
          const v = array[index];
          const values = v.split(":");
          for (let ind = 0; ind < values.length; ind++) {
            if (values[ind].indexOf("+") !== -1) {
              obj.push({ number: values[ind] });
            }
            if (values[ind].indexOf("FN") !== -1) {
              contact = values[ind + 1];
            }
          }
        }
        for await (const ob of obj) {
          const cont = await CreateContactService({
            name: contact,
            number: ob.number.replace(/\D/g, "")
          });
        }
      } catch (error) {
        console.log(error);
      }
    }

    /* if (msg.type === "multi_vcard") {
      try {
        const array = msg.vCards.toString().split("\n");
        let name = "";
        let number = "";
        const obj = [];
        const conts = [];
        for (let index = 0; index < array.length; index++) {
          const v = array[index];
          const values = v.split(":");
          for (let ind = 0; ind < values.length; ind++) {
            if (values[ind].indexOf("+") !== -1) {
              number = values[ind];
            }
            if (values[ind].indexOf("FN") !== -1) {
              name = values[ind + 1];
            }
            if (name !== "" && number !== "") {
              obj.push({
                name,
                number
              });
              name = "";
              number = "";
            }
          }
        }

        // eslint-disable-next-line no-restricted-syntax
        for await (const ob of obj) {
          try {
            const cont = await CreateContactService({
              name: ob.name,
              number: ob.number.replace(/\D/g, "")
            });
            conts.push({
              id: cont.id,
              name: cont.name,
              number: cont.number
            });
          } catch (error) {
            if (error.message === "ERR_DUPLICATED_CONTACT") {
              const cont = await GetContactService({
                name: ob.name,
                number: ob.number.replace(/\D/g, ""),
                email: ""
              });
              conts.push({
                id: cont.id,
                name: cont.name,
                number: cont.number
              });
            }
          }
        }
        msg.body = JSON.stringify(conts);
      } catch (error) {
        console.log(error);
      }
    } */

	        /**********************************************************************************************************/
        //INTEGRAÇÃO WHATICKET BOTPRESS
        //userId ==> é o id do usuario bot no whaticket
        //direction ==> false - mensagens de entrada1
        //WhatsappId = whatsapp.id

        console.log('/************************DEFINE A URL DO BOT DEPENDENDO DO WHATSAPPID**************************************')
        //var urlBot = `http://181.189.44.110:3000/api/v1/bots/clinica_mama_1/converse/${contact.number}`
        var urlBot = `${process.env.URL_BOT}${contact.number}`
        switch(whatsapp.id){
            default:
                console.log(urlBot)
                console.log(ticket.userId,direction,msg.type)
        }
        console.log('/**********************************************************************************************************')

        if (ticket.userId === 2 && direction == false && msg.type !== "call_log") {

            const msgBotPress = msg.body
            let msgText;
            let bot_msg = {
                "type": "text",
                "text": msgBotPress
            }

            try {
                const { data } = await axios.post(urlBot, bot_msg)

                console.log(data)

                for (var i = 0; i < data.responses.length; i++) {
                    var type = data.responses[i].type
                    switch (type) {
                        case "text":
                            msgText = data.responses[i].text
                            //msgText ==> end indica q o fluxo encerrou no BotPress
                            //O ticket retorna para fila para um atendente poder seguir o atendimento
                            console.log(msgText)

                            let option = msgText.split(":")
                            let bot_status = "pending"
                            let bot_userId = null
                            let bot_queueId = null

                            switch(option[0]){
                                case 'end':
                                    if(!['1','2','3','4','5','6','7','8','9','0'].includes(option[1])){
                                        if(option[1] !== 'fha'){
                                            option[1] = '1'
                                        }
                                    }

                                    switch(option[1]){
                                        case '1':
                                            msgText = '*Marcação de Consultas e Exames*\r\n'
                                            +'Por favor, informe os seguinte dados para atendimento:\r\n'
                                            +'Nome Completo:\r\n'
                                            +'Data de Nascimento:\r\n'
                                            +'Unidade (Asa Norte, Asa Sul ou Taguatinga):\r\n'
                                            +'Convênio:\r\n'
                                            +'Para agendar exames é necessário enviar foto do pedido médico. Caso seja consulta, informar *Especialidade* desejada\r\n'
                                            ticket.queueId = 5
                                            bot_queueId = '5'
                                        break

                                        case '4':
                                            msgText = '*Ouvidoria*'
                                            ticket.queueId = 9
                                            bot_queueId = '9'
                                        break

                                        case '5':
                                            msgText = '*Cartão Anjo*'
                                            ticket.queueId = 4
                                            bot_queueId = '4'
                                        break

                                        default:
                                            msgText = '*Marcação de consultas e/ou exames*'
                                            ticket.queueId = 5
                                            bot_queueId = '5'
                                    }

                                    await ticket.update({
                                        status: bot_status,
                                        userId: bot_userId,
                                        queueId: bot_queueId
                                    });

                                    //Apenas envia menssagem para o whatsapp dento do horario de atendimento
                                    if(option[1] !== 'fha'){
                                        const sentMessage = await wbot.sendMessage(`${contact.number}@c.us`, `*Você foi direcionado para* ${msgText}`);
                                        await verifyMessage(sentMessage, ticket, contact);
                                    }
                                break;

                                case 'end_resultado_exames':
                                    console.log('end_resultado_exames')
                                    if(!['1','2','3','4','5','6','7','8','9','0'].includes(option[1])){
                                        if(option[1] !== 'fha'){
                                            option[1] = '1'
                                        }
                                    }

                                    switch(option[1]){
                                        case '1':
                                            msgText = 'Resultado Asa Sul'
                                            ticket.queueId = 11
                                            bot_queueId = '11'
                                        break

                                        case '2':
                                            msgText = 'Resultado Asa Norte'
                                            ticket.queueId = 10
                                            bot_queueId = '10'
                                        break

                                        case '3':
                                            msgText = 'Resultado Taguatinga'
                                            ticket.queueId = 12
                                            bot_queueId = '12'
                                        break;
                                    }

                                    await ticket.update({
                                        status: bot_status,
                                        userId: bot_userId,
                                        queueId: bot_queueId
                                    });

                                    //Apenas envia menssagem para o whatsapp dento do horario de atendimento
                                    if(option[1] !== 'fha'){
                                        const sentMessage = await wbot.sendMessage(`${contact.number}@c.us`, `*Você foi direcionado para ${msgText}.*`);
                                        await verifyMessage(sentMessage, ticket, contact);
                                    }
                                break;

                                case 'end_autorizacao':
                                    console.log('end_resultado_exames')
                                    if(!['1','2','3','4','5','6','7','8','9','0'].includes(option[1])){
                                        if(option[1] !== 'fha'){
                                            option[1] = '1'
                                        }
                                    }
                                    switch(option[1]){
                                        case '1':
                                            msgText = '*Autorização Asa Sul*'
                                            +'\r\nVocê selecionou a opção Autorização, envie sua documentação e caso já tenha enviado '
                                            +'recebemos sua mensagem e em breve daremos entrada em sua solicitação em um prazo de até '
                                            +'48 horas. Caso faltem documentos, solicitaremos através desse viés. 😉'
                                            ticket.queueId = 2
                                            bot_queueId = '2'
                                        break

                                        case '2':
                                            msgText = '*Autorização Asa Norte*'
                                            +'\r\nVocê selecionou a opção Autorização, envie sua documentação e caso já tenha enviado '
                                            +'recebemos sua mensagem e em breve daremos entrada em sua solicitação em um prazo de até '
                                            +'48 horas. Caso faltem documentos, solicitaremos através desse viés. 😉'
                                            ticket.queueId = 1
                                            bot_queueId = '1'
                                        break

                                        case '3':
                                            msgText = '*Autorização Taguatinga*'
                                            +'\r\nVocê selecionou a opção Autorização, envie sua documentação e caso já tenha enviado '
                                            +'recebemos sua mensagem e em breve daremos entrada em sua solicitação em um prazo de até '
                                            +'48 horas. Caso faltem documentos, solicitaremos através desse viés. 😉'
                                            ticket.queueId = 3
                                            bot_queueId = '3'
                                        break;
                                    }

                                    await ticket.update({
                                        status: bot_status,
                                        userId: bot_userId,
                                        queueId: bot_queueId
                                    });

                                    //Apenas envia menssagem para o whatsapp dento do horario de atendimento
                                    if(option[1] !== 'fha'){
                                        const sentMessage = await wbot.sendMessage(`${contact.number}@c.us`, `*Você foi direcionado para* ${msgText}.`);
                                        await verifyMessage(sentMessage, ticket, contact);
                                    }
                                break;

                                case 'end_medicos':
                                    console.log('end_resultado_exames')
                                    if(!['1','2','3','4','5','6','7','8','9','0'].includes(option[1])){
                                        if(option[1] !== 'fha'){
                                            option[1] = '1'
                                        }
                                    }

                                    switch(option[1]){
                                        case '1':
                                            msgText = 'Médicos Asa Sul'
                                            ticket.queueId = 7
                                            bot_queueId = '7'
                                        break;

                                        case '2':
                                            msgText = 'Médicos Asa Norte'
                                            ticket.queueId = 10
                                            bot_queueId = '10'
                                        break;

                                        case '3':
                                            msgText = 'Médicos Taguatinga'
                                            ticket.queueId = 8
                                            bot_queueId = '8'
                                        break;

                                    }

                                    await ticket.update({
                                        status: bot_status,
                                        userId: bot_userId,
                                        queueId: bot_queueId
                                    });

                                    //Apenas envia menssagem para o whatsapp dento do horario de atendimento
                                    if(option[1] !== 'fha'){
                                        const sentMessage = await wbot.sendMessage(`${contact.number}@c.us`, `*Você foi direcionado para ${msgText}.*`);
                                        await verifyMessage(sentMessage, ticket, contact);
                                    }
                                break;


                                case 'end_angiologia_asa_sul':
                                    console.log('end_resultado_exames')
                                    if(!['1','2','3','4','5','6','7','8','9','0'].includes(option[1])){
                                        if(option[1] !== 'fha'){
                                            option[1] = '1'
                                        }
                                    }

                                    switch(option[1]){
                                        default:
                                            msgText = 'Médicos Asa Sul->Angiologia'
                                            ticket.queueId = 10
                                            bot_queueId = '10'
                                    }

                                    await ticket.update({
                                        status: bot_status,
                                        userId: bot_userId,
                                        queueId: bot_queueId
                                    });

                                    //Apenas envia menssagem para o whatsapp dento do horario de atendimento
                                    if(option[1] !== 'fha'){
                                        const sentMessage = await wbot.sendMessage(`${contact.number}@c.us`, `*Você foi direcionado para ${msgText}.*`);
                                        await verifyMessage(sentMessage, ticket, contact);
                                    }
                                break;

                                case 'end_cirurgia_plastica_asa_sul':
                                    console.log('end_resultado_exames')
                                    if(!['1','2','3','4','5','6','7','8','9','0'].includes(option[1])){
                                        if(option[1] !== 'fha'){
                                            option[1] = '1'
                                        }
                                    }

                                    switch(option[1]){
                                        default:
                                            msgText = 'Médicos Asa Sul->Cirurgia Plástica'
                                            ticket.queueId = 10
                                            bot_queueId = '10'
                                    }

                                    await ticket.update({
                                        status: bot_status,
                                        userId: bot_userId,
                                        queueId: bot_queueId
                                    });

                                    //Apenas envia menssagem para o whatsapp dento do horario de atendimento
                                    if(option[1] !== 'fha'){
                                        const sentMessage = await wbot.sendMessage(`${contact.number}@c.us`, `*Você foi direcionado para ${msgText}.*`);
                                        await verifyMessage(sentMessage, ticket, contact);
                                    }
                                break;

                                case 'end_ginecologia_asa_sul':
                                    console.log('end_resultado_exames')
                                    if(!['1','2','3','4','5','6','7','8','9','0'].includes(option[1])){
                                        if(option[1] !== 'fha'){
                                            option[1] = '1'
                                        }
                                    }

                                    switch(option[1]){
                                        default:
                                            msgText = 'Médicos Asa Sul->Ginecologia'
                                            ticket.queueId = 10
                                            bot_queueId = '10'
                                    }

                                    await ticket.update({
                                        status: bot_status,
                                        userId: bot_userId,
                                        queueId: bot_queueId
                                    });

                                    //Apenas envia menssagem para o whatsapp dento do horario de atendimento
                                    if(option[1] !== 'fha'){
                                        const sentMessage = await wbot.sendMessage(`${contact.number}@c.us`, `*Você foi direcionado para ${msgText}.*`);
                                        await verifyMessage(sentMessage, ticket, contact);
                                    }
                                break;

                                case 'end_mastologia_asa_sul_feminino':
                                    console.log('end_resultado_exames')
                                    if(!['1','2','3','4','5','6','7','8','9','0'].includes(option[1])){
                                        if(option[1] !== 'fha'){
                                            option[1] = '1'
                                        }
                                    }

                                    switch(option[1]){
                                        default:
                                            msgText = 'Médicos Asa Sul->Mastologia Feminino'
                                            ticket.queueId = 10
                                            bot_queueId = '10'
                                    }

                                    await ticket.update({
                                        status: bot_status,
                                        userId: bot_userId,
                                        queueId: bot_queueId
                                    });

                                    //Apenas envia menssagem para o whatsapp dento do horario de atendimento
                                    if(option[1] !== 'fha'){
                                        const sentMessage = await wbot.sendMessage(`${contact.number}@c.us`, `*Você foi direcionado para ${msgText}.*`);
                                        await verifyMessage(sentMessage, ticket, contact);
                                    }
                                break;

                                case 'end_mastologia_asa_sul_masculino':
                                    console.log('end_resultado_exames')
                                    if(!['1','2','3','4','5','6','7','8','9','0'].includes(option[1])){
                                        if(option[1] !== 'fha'){
                                            option[1] = '1'
                                        }
                                    }

                                    switch(option[1]){
                                        default:
                                            msgText = 'Médicos Asa Sul->Mastologia Masculino'
                                            ticket.queueId = 10
                                            bot_queueId = '10'
                                    }

                                    await ticket.update({
                                        status: bot_status,
                                        userId: bot_userId,
                                        queueId: bot_queueId
                                    });

                                    //Apenas envia menssagem para o whatsapp dento do horario de atendimento
                                    if(option[1] !== 'fha'){
                                        const sentMessage = await wbot.sendMessage(`${contact.number}@c.us`, `*Você foi direcionado para ${msgText}.*`);
                                        await verifyMessage(sentMessage, ticket, contact);
                                    }
                                break;

                                default:
                                    //Envia menssagem para o whatsapp e atualiza no whaticket
                                    const sentMessage = await wbot.sendMessage(`${contact.number}@c.us`, msgText);
                                    await verifyMessage(sentMessage, ticket, contact);
                            }
                        break;
                    }
                }
            } catch (err) {
                console.log(err)
            }
		}
        /**********************************************************************************************************/


    if(msg.type==="call_log" && callSetting==="disabled"){
      const sentMessage = await wbot.sendMessage(`${contact.number}@c.us`, "*Mensagem Automática:*\nAs chamadas de voz e vídeo estão desabilitas para esse WhatsApp, favor enviar uma mensagem de texto. Obrigado");
      await verifyMessage(sentMessage, ticket, contact);
    }

  } catch (err) {
    Sentry.captureException(err);
    logger.error(`Error handling whatsapp message: Err: ${err}`);
  }
};

const handleMsgAck = async (msg: WbotMessage, ack: MessageAck) => {
  await new Promise(r => setTimeout(r, 500));

  const io = getIO();

  try {
    const messageToUpdate = await Message.findByPk(msg.id.id, {
      include: [
        "contact",
        {
          model: Message,
          as: "quotedMsg",
          include: ["contact"]
        }
      ]
    });
    if (!messageToUpdate) {
      return;
    }
    await messageToUpdate.update({ ack });

    io.to(messageToUpdate.ticketId.toString()).emit("appMessage", {
      action: "update",
      message: messageToUpdate
    });

  } catch (err) {
    Sentry.captureException(err);
    logger.error(`Error handling message ack. Err: ${err}`);
  }
};

const wbotMessageListener = (wbot: Session): void => {
  wbot.on("message_create", async msg => {
    handleMessage(msg, wbot);
  }
  );

  wbot.on("media_uploaded", async msg => {
    handleMessage(msg, wbot);
  });

  wbot.on("message_ack", async (msg, ack) => {
    handleMsgAck(msg, ack);
  });
};

export { wbotMessageListener, handleMessage };
