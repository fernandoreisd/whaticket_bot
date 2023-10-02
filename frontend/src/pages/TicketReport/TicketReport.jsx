import React, { useContext, useEffect, useReducer, useState } from 'react';
import Container from '@material-ui/core/Container';
import MainHeader from '../../components/MainHeader';
import { i18n } from '../../translate/i18n';
import Title from '../../components/Title';
import {
  Button,
  FormControl,
  InputLabel,
  MenuItem,
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
import Pagination from '@material-ui/lab/Pagination';

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
  },
  searchPaper: {
    display: 'flex',
    padding: theme.spacing(0.5),
    overflowY: 'hidden',
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
    margin: theme.spacing(1.5),
    minWidth: 120,
  },
  dateContainer: {
    display: 'flex',
    flexWrap: 'wrap',
  },
  dateTextField: {
    margin: theme.spacing(1.5),
    width: 200,
  },
  button: {
    margin: theme.spacing(1.5),
    minWidth: 120,
  },
  paginationContainer: {
    display: 'flex',
    justifyContent: 'center',
  },
}));

function TicketReport() {
  const classes = useStyles();
  const { whatsApps } = useContext(WhatsAppsContext);
  const [queues, setQueues] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState({
    queueid: '',
    status: '',
    userId: '',
    startDate: '',
    endDate: '',
  });
  const [listTickets, setListTickets] = useState({});

  const [page, setPage] = useState(1);
  const [numberPages, setNumberPages] = useState(1);

  const handlePage = (event, value) => {
    setPage(value);
  };

  useEffect(() => {
    getListTickets();
  }, [page]);

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
      [name]: value,
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

  const getListTickets = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/tickets/search/', {
        params: {
          pageNumber: page,
          status: searchParams.status,
          startDate: searchParams.startDate,
          endDate: searchParams.endDate,
          searchParam: '',
          userId: searchParams.userId,
          queueIds: searchParams.queueid,
          withUnreadMessages: false,
        },
      });
      if (data.hasMore) {
        const numeroDePaginas = Math.ceil(+data.count / +data.tickets.length);
        setNumberPages(numeroDePaginas);
      }

      setListTickets(data);
      setLoading(false);
    } catch (err) {
      toastError(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    getQueues();
    getUsers();
    getListTickets();
  }, []);

  const phoneFormater = (number) => {
    return number
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const statusFormater = (status) => {
    let formattedStatus = status;
    let backgroundColor = 'transparent';

    switch (status) {
      case 'closed':
        formattedStatus = 'Fechado';
        backgroundColor = '#b30000';
        break;
      case 'open':
        formattedStatus = 'Aberto';
        backgroundColor = '#005e00';
        break;
      case 'pending':
        formattedStatus = 'Andamento';
        backgroundColor = '#e4e500';
        break;

      default:
        break;
    }
    return { formattedStatus, backgroundColor };
  };

  return (
    <Container maxWidth={false}>
      <MainHeader>
        <Title>{i18n.t('ticketReport.title')}</Title>
      </MainHeader>
      <Paper className={classes.searchPaper} elevation={1}>
        <FormControl variant="outlined" className={classes.formControl}>
          <InputLabel
            display="flex"
            id="status-input-label"
            htmlFor="outlined-status-native-simple"
          >
            Status
          </InputLabel>
          <Select
            labelId="status-input-label"
            name="status"
            label="Status do Atendimento"
            native
            value={searchParams.status}
            onChange={handleChange}
          >
            <option value={''}></option>
            <option value={'open'}>Aberto</option>
            <option value={'pending'}>Andamento</option>
            <option value={'closed'}>Fechado</option>
          </Select>
        </FormControl>
        <FormControl variant="outlined" className={classes.formControl}>
          <InputLabel htmlFor="outlined-queue-native-simple">Fila</InputLabel>
          <Select
            labelId="queue-input-label"
            name="queueid"
            native
            label="Fila"
            value={searchParams.queueid}
            onChange={handleChange}
          >
            <option value={''}></option>
            {queues &&
              queues.map((queue) => (
                <option key={queue.id} value={queue.id}>
                  {queue.name}
                </option>
              ))}
          </Select>
        </FormControl>
        <FormControl variant="outlined" className={classes.formControl}>
          <InputLabel htmlFor="outlined-user-native-simple">Usuário</InputLabel>
          <Select
            labelId="user-input-label"
            name="userId"
            native
            label="Usuário"
            value={searchParams.userId}
            onChange={handleChange}
          >
            <option value={''}></option>
            {users &&
              users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
          </Select>
        </FormControl>
        <div>
          <form className={classes.dateContainer} noValidate>
            <TextField
              id="startDate"
              name="startDate"
              label="Data Inicial"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className={classes.dateTextField}
              onChange={handleChange}
              variant="outlined"
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
              defaultValue={new Date().toISOString().slice(0, 10)}
              className={classes.dateTextField}
              onChange={handleChange}
              variant="outlined"
            />
          </form>
        </div>
        <Button
          variant="contained"
          color="default"
          className={classes.button}
          startIcon={<SearchIcon />}
          onClick={getListTickets}
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
              {listTickets.tickets &&
                listTickets.tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell align="center">{ticket.contact.name}</TableCell>
                    <TableCell align="center">
                      {phoneFormater(ticket.contact.number)}
                    </TableCell>
                    <TableCell align="center">
                      <div
                        id={'statusTag-' + ticket.id}
                        style={{
                          backgroundColor: statusFormater(ticket.status)
                            .backgroundColor,
                        }}
                        className={classes.tagColors}
                      >
                        {statusFormater(ticket.status).formattedStatus}
                      </div>
                    </TableCell>
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
      <div className={classes.paginationContainer}>
        <Pagination
          count={numberPages}
          variant="outlined"
          shape="rounded"
          onChange={handlePage}
        />
      </div>
    </Container>
  );
}

export default TicketReport;
