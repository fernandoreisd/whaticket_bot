import React, { useState, useEffect, useRef, useContext } from "react";

import { useHistory, useParams } from "react-router-dom";
import { parseISO, format, isSameDay } from "date-fns";
import clsx from "clsx";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import Typography from "@material-ui/core/Typography";
import Avatar from "@material-ui/core/Avatar";
import Divider from "@material-ui/core/Divider";
import Badge from "@material-ui/core/Badge";
import IconButton from "@material-ui/core/IconButton";
import { i18n } from "../../translate/i18n";
import VisibilityIcon from "@material-ui/icons/Visibility";
import api from "../../services/api";
import ButtonWithSpinner from "../ButtonWithSpinner";
import MarkdownWrapper from "../MarkdownWrapper";
import { Tooltip } from "@material-ui/core";
import { AuthContext } from "../../context/Auth/AuthContext";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  ticket: {
    position: "relative",
  },

  pendingTicket: {
    cursor: "unset",
  },

  noTicketsDiv: {
    display: "flex",
    height: "100px",
    margin: 40,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },

  noTicketsText: {
    textAlign: "center",
    color: "rgb(104, 121, 146)",
    fontSize: "14px",
    lineHeight: "1.4",
  },

  noTicketsTitle: {
    textAlign: "center",
    fontSize: "16px",
    fontWeight: "600",
    margin: "0px",
  },

  secondaryWrapper: {
    display: "flex",
    justifyContent: "space-between",
    flexDirection: "row-reverse",
  },

  lastMessageTime: {
    justifySelf: "flex-end",
  },

  closedBadge: {
    alignSelf: "center",
    justifySelf: "flex-end",
    marginRight: 32,
    marginLeft: "auto",
  },

  contactLastMessage: {
    paddingRight: 20,
  },

  newMessagesCount: {
    alignSelf: "center",
    marginRight: 8,
    marginLeft: "auto",
  },

  bottomButton: {
    top: "12px",
  },

  badgeStyle: {
    color: "white",
    backgroundColor: green[500],
  },

  acceptButton: {
    position: "absolute",
    left: "50%",
  },

  ticketQueueColor: {
    flex: "none",
    width: "8px",
    height: "100%",
    position: "absolute",
    top: "0%",
    left: "0%",
  },

  contactNameWrapper: {
    display: "flex",
    justifyContent: "space-between",
  },

  userTag: {
    marginRight: 5,
    right: 20,
    bottom: 30,
    background: "#511414",
    color: "#ffffff",
    border: "1px solid #CCC",
    padding: 1,
    paddingLeft: 5,
    paddingRight: 5,
    borderRadius: 10,
    fontSize: "0.9em",
  },

  tagColors: {
    marginRight: 5,
    right: 20,
    bottom: 30,
    color: "#ffffff",
    border: "1px solid #CCC",
    padding: 1,
    paddingLeft: 5,
    paddingRight: 5,
    borderRadius: 10,
    fontSize: "0.9em",
  },
}));

const TicketListItem = (props) => {
  const { ticket, agents } = props;
  const classes = useStyles();
  const history = useHistory();
  const [loading, setLoading] = useState(false);
  const { ticketId } = useParams();
  const isMounted = useRef(true);
  const { user } = useContext(AuthContext);

  const agent = agents.filter((agent) => agent?.id === ticket?.userId).shift();

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleAcepptTicket = async (id) => {
    setLoading(true);
    try {
      await api.put(`/tickets/${id}`, {
        status: "open",
        userId: user?.id,
      });
    } catch (err) {
      setLoading(false);
      toastError(err);
    }
    if (isMounted.current) {
      setLoading(false);
    }
    history.push(`/tickets/${id}`);
  };

  const handleViewTicket = async (id) => {
    setLoading(true);
    try {
      await api.put(`/tickets/${id}`, {
        status: "pending",
      });
    } catch (err) {
      setLoading(false);
      toastError(err);
    }
    if (isMounted.current) {
      setLoading(false);
    }
    history.push(`/tickets/${id}`);
  };

  const handleSelectTicket = (id) => {
    history.push(`/tickets/${id}`);
  };

  return (
    <React.Fragment key={ticket.id}>
      <ListItem
        id={"buttonItem-" + ticket.id}
        dense
        button
        onClick={(e) => {
          if (ticket.status === "pending") return;
          handleSelectTicket(ticket.id);
        }}
        selected={ticketId && +ticketId === ticket.id}
        className={clsx(classes.ticket, {
          [classes.pendingTicket]: ticket.status === "pending",
        })}
      >
        <Tooltip
          arrow
          placement="right"
          title={ticket.queue?.name || "Sem fila"}
        >
          <span
            id={"ticketQueueColor-" + ticket.id}
            style={{ backgroundColor: ticket.queue?.color || "#7C7C7C" }}
            className={classes.ticketQueueColor}
          ></span>
        </Tooltip>
        <ListItemAvatar id={"avatarTag-" + ticket.id}>
          <Avatar
            id={"avatarPic-" + ticket.id}
            src={ticket?.contact?.profilePicUrl}
          />
        </ListItemAvatar>
        <ListItemText
          id={"ListItem-" + ticket.id}
          disableTypography
          primary={
            <span
              id={"primaryItem-" + ticket.id}
              className={classes.contactNameWrapper}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <Typography
                  id={"ContactName-" + ticket.id}
                  noWrap
                  component="span"
                  variant="body2"
                  color="textPrimary"
                >
                  {ticket.contact.name}
                </Typography>
                <Typography
                  id={"lastMessage-" + ticket.id}
                  className={classes.contactLastMessage}
                  noWrap
                  component="span"
                  variant="body2"
                  color="textSecondary"
                >
                  {ticket.lastMessage ? (
                    <MarkdownWrapper>{`${ticket?.contact.name}: ${ticket.lastMessage}`}</MarkdownWrapper>
                  ) : (
                    <br />
                  )}
                </Typography>
              </div>
              {ticket.lastMessage && (
                <Typography
                  id={"lastMessageDate-" + ticket.id}
                  className={classes.lastMessageTime}
                  component="span"
                  variant="body2"
                  color="textSecondary"
                >
                  {isSameDay(parseISO(ticket.updatedAt), new Date()) ? (
                    <>{format(parseISO(ticket.updatedAt), "HH:mm")}</>
                  ) : (
                    <>{format(parseISO(ticket.updatedAt), "dd/MM/yyyy")}</>
                  )}
                </Typography>
              )}
            </span>
          }
          secondary={
            <span
              id={"secondaryItem-" + ticket.id}
              className={classes.secondaryWrapper}
            >
              <Badge
                id={"badgeTag-" + ticket.id}
                className={classes.newMessagesCount}
                badgeContent={ticket.unreadMessages}
                classes={{
                  badge: classes.badgeStyle,
                }}
              />
              <Typography
                style={{ display: "flex" }}
                component="span"
                variant="body2"
                color="textPrimary"
              >
                {ticket.whatsappId && (
                  <div
                    id={"userTag-" + ticket.id}
                    className={classes.userTag}
                    title={i18n.t("ticketsList.connectionTitle")}
                  >
                    {user?.name}
                  </div>
                )}
                {agent && (
                  <div
                    id={"agentTag-" + ticket.id}
                    style={{ backgroundColor: "#6b62fe" }}
                    className={classes.tagColors}
                    title={i18n.t("ticketsList.connectionTitle")}
                  >
                    {agent.name}
                  </div>
                )}
                {ticket.whatsappId && (
                  <div
                    id={"queueTag-" + ticket.id}
                    style={{ backgroundColor: ticket.queue?.color }}
                    className={classes.tagColors}
                    title={i18n.t("ticketsList.connectionTitle")}
                  >
                    {ticket?.queue.name}
                  </div>
                )}
              </Typography>
            </span>
          }
        />

        {ticket.status === "pending" && (
          <ButtonWithSpinner
            color="primary"
            variant="contained"
            className={classes.acceptButton}
            size="small"
            loading={loading}
            onClick={(e) => handleAcepptTicket(ticket.id)}
          >
            {i18n.t("ticketsList.buttons.accept")}
          </ButtonWithSpinner>
        )}

        {ticket.status === "pending" && (
          <IconButton
            className={classes.bottomButton}
            color="primary"
            onClick={(e) => handleViewTicket(ticket.id)}
          >
            <VisibilityIcon />
          </IconButton>
        )}
      </ListItem>
      <Divider variant="inset" component="li" />
    </React.Fragment>
  );
};

export default TicketListItem;
