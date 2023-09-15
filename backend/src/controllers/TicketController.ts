import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import CreateTicketService from "../services/TicketServices/CreateTicketService";
import DeleteTicketService from "../services/TicketServices/DeleteTicketService";
import ListTicketsService from "../services/TicketServices/ListTicketsService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import ShowQueueService from "../services/QueueService/ShowQueueService";
import ShowUserService from "../services/UserServices/ShowUserService";
import formatBody from "../helpers/Mustache";
import SearchTicketService, {SearchRequest} from "../services/TicketServices/SearchTicketService";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
  status: string;
  date: string;
  showAll: string;
  withUnreadMessages: string;
  queueIds: string;
};

interface TicketData {
  contactId: number;
  status: string;
  queueId: number;
  userId: number;
  transf: boolean;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const {pageNumber, status, date, searchParam, showAll, queueIds: queueIdsStringified,
    withUnreadMessages
  } = req.query as IndexQuery;

  const userId = req.user.id;

  let queueIds: number[] = [];

  if (queueIdsStringified) {
    queueIds = JSON.parse(queueIdsStringified);
  }

  const { tickets, count, hasMore } = await ListTicketsService({
    searchParam,
    pageNumber,
    status,
    date,
    showAll,
    userId,
    queueIds,
    withUnreadMessages
  });

  return res.status(200).json({ tickets, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { contactId, queueId, status, userId }: TicketData = req.body;

  const ticket = await CreateTicketService({ contactId, status, userId, queueId });

  const io = getIO();
  io.to(ticket.status).emit("ticket", {
    action: "update",
    ticket
  });

  return res.status(200).json(ticket);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;

  const contact = await ShowTicketService(ticketId);

  return res.status(200).json(contact);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const ticketData: TicketData = req.body;

  const { ticket } = await UpdateTicketService({
    ticketData,
    ticketId
  });

  if(ticketData.transf) {
    //const {name} = await ShowQueueService(ticketData.queueId);

    if(ticketData.userId) {
      const nome = await ShowUserService(ticketData.userId);
      const msgtxt = "Chat transferido. O(a) consultor(a) *"+nome.name+"* irá atendê-lo(a). Aguarde um momento por gentileza!";
      await SendWhatsAppMessage({body: msgtxt, ticket});
    }else {
      const {name} = await ShowQueueService(ticketData.queueId);
      const msgtxt = "*Mensagem Automática:* Chat tranferido para o departamento *"+name+"*.\nAguarde um momento, iremos atende-lo(a)!";
      await SendWhatsAppMessage({body: msgtxt, ticket});
    }
  }

  if (ticket.status === "closed") {
    const whatsapp = await ShowWhatsAppService(ticket.whatsappId);

    const { farewellMessage } = whatsapp;

    if (farewellMessage) {
      await SendWhatsAppMessage({
        body: formatBody(farewellMessage, ticket.contact),
        ticket
      });
    }
  }

  return res.status(200).json(ticket);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;

  const ticket = await DeleteTicketService(ticketId);

  const io = getIO();
  io.to(ticket.status)
    .to(ticketId)
    .to("notification")
    .emit("ticket", {
      action: "delete",
      ticketId: +ticketId
    });

  return res.status(200).json({ message: "ticket deleted" });
};




export const search = async (req: Request, res: Response): Promise<Response> => {
  const { pageNumber,
          status,
          startDate,
          endDate,
          searchParam,
          userId,
          queueIds,
          withUnreadMessages
  } = req.query as unknown as SearchRequest;

  let queueIds_: number[] = [];

  if (queueIds) {
    const _ids = queueIds+''
    const ids = _ids.split(',')
    ids.forEach((id: string)=>{
      const number = parseInt(id)
      if(isNaN(number))return
      queueIds_.push(number)
    })
  }

  const { tickets, count, hasMore } = await SearchTicketService({
    searchParam,
    pageNumber,
    status,
    startDate,
    endDate,
    userId,
    queueIds:queueIds_,
    withUnreadMessages
  });

  return res.status(200).json({ tickets, count, hasMore });

};
