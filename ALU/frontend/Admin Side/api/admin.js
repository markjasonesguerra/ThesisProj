import client from './client';

export const listTickets = (params) => client.get('/api/admin/tickets', { params });
export const getTicket = (id) => client.get(`/api/admin/tickets/${id}`);
export const postTicketMessage = (ticketId, payload) => client.post(`/api/admin/tickets/${ticketId}/messages`, payload);
export const updateTicket = (ticketId, payload) => client.patch(`/api/admin/tickets/${ticketId}`, payload);

export const listBenefitPrograms = () => client.get('/api/admin/benefits/programs');
export const listBenefitRequests = (params) => client.get('/api/admin/benefits/requests', { params });
export const getBenefitRequest = (id) => client.get(`/api/admin/benefits/requests/${id}`);

export const listEvents = (params) => client.get('/api/admin/events', { params });
export const getEvent = (id) => client.get(`/api/admin/events/${id}`);
export const createEvent = (payload) => client.post('/api/admin/events', payload);
export const updateEvent = (id, payload) => client.put(`/api/admin/events/${id}`, payload);
export const deleteEvent = (id) => client.delete(`/api/admin/events/${id}`);

export const getReportsSummary = () => client.get('/api/admin/reports/summary');
export const exportTicketsReport = (params) => client.get('/api/admin/reports/tickets', { params });

export default {
  listTickets,
  getTicket,
  postTicketMessage,
  updateTicket,
  listBenefitPrograms,
  listBenefitRequests,
  getBenefitRequest,
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  getReportsSummary,
  exportTicketsReport,
};
