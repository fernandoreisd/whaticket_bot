import { Op, fn, where, col, Filterable, Includeable } from "sequelize";
import { startOfDay, endOfDay, parseISO } from "date-fns";

import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Queue from "../../models/Queue";
import ShowUserService from "../UserServices/ShowUserService";

export interface SearchRequest {
  searchParam?: string;
  pageNumber?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  userId?: number;
  withUnreadMessages?: string;
  queueIds: number[];
}

interface Response {
  tickets: Ticket[];
  count: number;
  hasMore: boolean;
}

const SearchTicketService = async ({searchParam = "", pageNumber = "1",startDate,endDate,queueIds, status, userId, withUnreadMessages}: SearchRequest): Promise<Response> => {
  let whereCondition: Filterable["where"] = {
    // [Op.or]: [{ status: "pending" }],
    // queueId: { [Op.or]: [queueIds, null] }
  };
  let includeCondition: Includeable[];

  includeCondition = [
    {
      model: Contact,
      as: "contact",
      attributes: ["id", "name", "number", "profilePicUrl"]
    },
    {
      model: Queue,
      as: "queue",
      attributes: ["id", "name", "color"]
    }
  ];

  if (queueIds.length>0) {
    whereCondition = { queueId: { [Op.and]: [queueIds, null] } };
  }

  if (userId) {
    whereCondition = {
      ...whereCondition,
      userId
    };
  }

  if (status) {
    whereCondition = {
      ...whereCondition,
      status
    };
  }

  if (startDate && endDate) {
    whereCondition = {
      ...whereCondition,
      // @ts-ignore
      [Op.or]: [{createdAt: {[Op.between]: [startDate, endDate]}}]
    };
  }


  const limit = 40;
  const offset = limit * (+pageNumber - 1);

  const { count, rows: tickets } = await Ticket.findAndCountAll({
    where: whereCondition,
    include: includeCondition,
    distinct: true,
    limit,
    offset,
    order: [["updatedAt", "DESC"]]
  });
console.log(whereCondition)
  const hasMore = count > offset + tickets.length;

  return {
    tickets,
    count,
    hasMore
  };
};

export default SearchTicketService;
