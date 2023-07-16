import { useState, useEffect } from "react";
import toastError from "../../errors/toastError";

import api from "../../services/api";

const useTickets = ({
    searchParam,
    pageNumber,
    status,
    date,
    showAll,
    queueIds,
    withUnreadMessages,
}) => {
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [requestFinished, setRequestFinished] = useState(false);
    const [tickets, setTickets] = useState([]);
    const [count, setCount] = useState(0);
    const [currentTarget, setCurrentTarget] = useState(null)

    useEffect(() => {
        setLoading(true);
        const delayDebounceFn = setTimeout(() => {
            const fetchTickets = async() => {
                try {
                    const { data } = await api.get("/tickets", {
                        params: {
                            searchParam,
                            pageNumber,
                            status,
                            date,
                            showAll,
                            queueIds,
                            withUnreadMessages,
                        },
                    })
                    setTickets(data.tickets)

                    let horasFecharAutomaticamente = process.env.REACT_APP_HOURS_CLOSE_TICKETS_AUTO

                    if (status === "open" && horasFecharAutomaticamente && horasFecharAutomaticamente !== "" &&
                        horasFecharAutomaticamente !== "0" && Number(horasFecharAutomaticamente) > 0) {

                        let dataLimite = new Date()
                        dataLimite.setHours(dataLimite.getHours() - Number(horasFecharAutomaticamente))

                        data.tickets.forEach(ticket => {
                            if (ticket.status !== "closed") {
                                let dataUltimaInteracaoChamado = new Date(ticket.updatedAt)
                                if (dataUltimaInteracaoChamado < dataLimite)
                                    closeTicket(ticket)
                            }
                        })
                    }

                    setHasMore(data.hasMore)
                    setCount(data.count)
                    setLoading(false);
                    setRequestFinished(true);
                    enabledScroll()
                } catch (err) {
                    setLoading(false)
                    toastError(err)
                    setRequestFinished(true);
                    enabledScroll()
                }
            }

            const closeTicket = async(ticket) => {
                await api.put(`/tickets/${ticket.id}`, {
                    status: "closed",
                    userId: ticket.userId || null,
                })
            }

            fetchTickets()
        }, 1000)
        return () => clearTimeout(delayDebounceFn)
    }, [
        searchParam,
        pageNumber,
        status,
        date,
        showAll,
        queueIds,
        withUnreadMessages,
    ])

    const disbledScroll = (elementHtml, scrollTop, scrollLeft) => {
      setCurrentTarget(elementHtml);
      elementHtml.onscroll = function() {
          elementHtml.scrollTo(scrollLeft, scrollTop);
      };
    }

    const enabledScroll = () => {
      if(!currentTarget) return;
      currentTarget.onscroll = function() {}
    }

    return { tickets, loading, hasMore, count, requestFinished, disbledScroll, setRequestFinished };
};

export default useTickets;