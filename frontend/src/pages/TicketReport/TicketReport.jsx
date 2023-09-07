import React, { useContext, useEffect, useReducer, useState } from 'react';
import MainContainer from '../../components/MainContainer';
import MainHeader from '../../components/MainHeader';
import { i18n } from '../../translate/i18n';
import Title from '../../components/Title';
import {
  Button,
  FormControl,
  InputLabel,
  Paper,
  Select,
  TableBody,
  TextField,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { green } from '@material-ui/core/colors';

import Table from '@material-ui/core/Table';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TableRowSkeleton from '../../components/TableRowSkeleton';
import SearchIcon from '@material-ui/icons/Search';

import { WhatsAppsContext } from '../../context/WhatsApp/WhatsAppsContext';
import api from '../../services/api';
import toastError from '../../errors/toastError';
import { AuthContext } from '../../context/Auth/AuthContext';

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
    overflowY: 'scroll',
    ...theme.scrollbarStyles,
  },
  searchPaper: {
    display: 'flex',
    padding: theme.spacing(0.5),
    overflowY: 'scroll',
    ...theme.scrollbarStyles,
  },
  customTableCell: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltip: {
    backgroundColor: '#f5f5f9',
    color: 'rgba(0, 0, 0, 0.87)',
    fontSize: theme.typography.pxToRem(14),
    border: '1px solid #dadde9',
    maxWidth: 450,
  },
  tooltipPopper: {
    textAlign: 'center',
  },
  buttonProgress: {
    color: green[500],
  },
  tagColors: {
    marginRight: 5,
    right: 20,
    bottom: 30,
    color: '#ffffff',
    border: '1px solid #CCC',
    padding: 1,
    paddingLeft: 5,
    paddingRight: 5,
    borderRadius: 10,
    fontSize: '0.9em',
  },
  userTag: {
    marginRight: 5,
    right: 20,
    bottom: 30,
    background: '#511414',
    color: '#ffffff',
    border: '1px solid #CCC',
    padding: 1,
    paddingLeft: 5,
    paddingRight: 5,
    borderRadius: 10,
    fontSize: '0.9em',
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
  },
  dateContainer: {
    display: 'flex',
    flexWrap: 'wrap',
  },
  dateTextField: {
    margin: theme.spacing(1),
    width: 200,
  },
  button: {
    margin: theme.spacing(1),
  },
}));

function TicketReport() {
  const { whatsApps } = useContext(WhatsAppsContext);
  const [queues, setQueues] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState({
    queueid: 0,
    status: '',
    userId: 0,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
  });
  const [listTickets, setlistTickets] = useState({
    tickets: [
      {
        id: 139,
        status: 'closed',
        unreadMessages: 0,
        lastMessage: 'obrigado',
        isGroup: false,
        userId: 6,
        contactId: 7,
        whatsappId: 1,
        queueId: 13,
        createdAt: '2023-06-29T13:25:35.0002',
        updatedAt: '2023-06-29T13:26:50.0002',
        contact: {
          id: 7,
          name: 'Valdir',
          number: '556184234985',
          profilePicUrl:
            'https://pps.whatsapp.net/v/t61.24694-24/34877847035710497665536635719463588232845367n.jpg?ccb=11-4&oh=01AdQj1adq5l6awugkWVeNmrmDx6ETe1EmGYat2AWdV2wgoe=64C39C24',
        },
        queue: {
          id: 13,
          name: 'Atendimento',
          color: '#0062b1',
        },
      },
      {
        id: 111,
        status: 'open',
        unreadMessages: 0,
        lastMessage: 'dinada',
        isGroup: true,
        userId: 1,
        contactId: 2,
        whatsappId: 3,
        queueId: 14,
        createdAt: '2023-06-29T13:25:35.0002',
        updatedAt: '2023-06-29T13:26:50.0002',
        contact: {
          id: 7,
          name: 'TESTE',
          number: '556184234444',
          profilePicUrl:
            'https://pps.whatsapp.net/v/t61.24694-24/34877847035710497665536635719463588232845367n.jpg?ccb=11-4&oh=01AdQj1adq5l6awugkWVeNmrmDx6ETe1EmGYat2AWdV2wgoe=64C39C24',
        },
        queue: {
          id: 14,
          name: 'Atendimento',
          color: '#0062b1',
        },
      },
    ],
    count: 2,
    hasMore: false,
  });

  //

  const classes = useStyles();

  const conectionName = (ticket) => {
    const conection = whatsApps
      .filter((whats) => whats.id === ticket?.whatsappId)
      .shift();
    const result = conection?.name || 'Sem Fila';
    return result;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setSearchParams({
      ...searchParams,
      [name]: event.target.value,
    });
  };

  const getQueues = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/queue');
      setQueues(data);
      setLoading(false);
    } catch (err) {
      toastError(err);
      setLoading(false);
    }
  };

  const getUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data?.users);
      setLoading(false);
    } catch (err) {
      toastError(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    getQueues();
    getUsers();
  }, []);

  return (
    <MainContainer>
      <MainHeader>
        <Title>{i18n.t('ticketReport.title')}</Title>
      </MainHeader>
      <Paper className={classes.searchPaper} elevation={1}>
        <FormControl variant="filled" className={classes.formControl}>
          <InputLabel htmlFor="filled-age-native-simple">Status</InputLabel>
          <Select
            name="queueid"
            native
            value={searchParams.queueid}
            onChange={handleChange}
          >
            <option value={0}></option>
            <option value={'open'}>Aberto</option>
            <option value={'pending'}>Aberto</option>
            <option value={'closed'}>Fechado</option>
          </Select>
        </FormControl>
        <FormControl variant="filled" className={classes.formControl}>
          <InputLabel htmlFor="filled-age-native-simple">Fila</InputLabel>
          <Select
            name="status"
            native
            value={searchParams.status}
            onChange={handleChange}
          >
            <option value={0}></option>
            {queues.map((queue) => (
              <option key={queue.id} value={queue.id}>
                {queue.name}
              </option>
            ))}
          </Select>
        </FormControl>
        <FormControl variant="filled" className={classes.formControl}>
          <InputLabel htmlFor="filled-age-native-simple">User</InputLabel>
          <Select
            name="userId"
            native
            value={searchParams.userId}
            onChange={handleChange}
          >
            <option value={0}></option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </Select>
        </FormControl>
        <div>
          <form className={classes.dateContainer} noValidate>
            <TextField
              id="date"
              name="startDate"
              label="Data Inicial"
              type="date"
              defaultValue={searchParams.startDate}
              className={classes.dateTextField}
              variant="filled"
            />
          </form>
        </div>
        <div>
          <form className={classes.dateContainer} noValidate>
            <TextField
              id="endDate"
              name="endDate"
              label="Data Final"
              type="date"
              defaultValue={searchParams.endDate}
              className={classes.dateTextField}
              variant="filled"
            />
          </form>
        </div>
        <Button
          variant="contained"
          color="default"
          className={classes.button}
          startIcon={<SearchIcon />}
        >
          Buscar
        </Button>
      </Paper>
      <Paper className={classes.mainPaper} elevation={3} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">
                {i18n.t('ticketReport.table.name')}
              </TableCell>
              <TableCell align="center">
                {i18n.t('ticketReport.table.whatsapp')}
              </TableCell>
              <TableCell align="center">
                {i18n.t('ticketReport.table.status')}
              </TableCell>
              <TableCell align="center">
                {i18n.t('ticketReport.table.queue')}
              </TableCell>
              <TableCell align="center">
                {i18n.t('ticketReport.table.connection')}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <>
              {}
              {listTickets.tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell align="center">{ticket.contact.name}</TableCell>
                  <TableCell align="center">{ticket.contact.number}</TableCell>
                  <TableCell align="center">{ticket.status}</TableCell>
                  <TableCell align="center">
                    {
                      <div
                        id={'queueTag-' + ticket.id}
                        style={{ backgroundColor: ticket.queue?.color }}
                        className={classes.tagColors}
                      >
                        {ticket.queue?.name || 'Sem Fila'}
                      </div>
                    }
                  </TableCell>
                  <TableCell align="center">
                    {
                      <div
                        id={'conectionTag-' + ticket.id}
                        className={classes.userTag}
                      >
                        {conectionName(ticket)}
                      </div>
                    }
                  </TableCell>
                </TableRow>
              ))}
              {loading && <TableRowSkeleton columns={4} />}
            </>
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
}

export default TicketReport;
