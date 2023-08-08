import React from "react";

import { Avatar, CardHeader } from "@material-ui/core";

import { i18n } from "../../translate/i18n";

const TicketInfo = ({ contact, ticket, onClick }) => {
	return (
		<CardHeader
			onClick={onClick}
			style={{ cursor: "pointer" }}
			titleTypographyProps={{ noWrap: true }}
			subheaderTypographyProps={{ noWrap: true }}
			avatar={<Avatar src={contact.profilePicUrl} alt="contact_image" />}
			title={`${contact.name}`}
			subheader={
				ticket.user &&
				`${i18n.t("messagesList.header.assignedTo")} ${ticket.user.name} | ${i18n.t("messagesList.header.sectorTo")} ${ticket?.queue.name}`
			}
		/>
	);
};

export default TicketInfo;
