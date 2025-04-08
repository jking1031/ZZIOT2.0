import axios from './axios';

export const TicketService = {
  getTickets: (params) => axios.get('/tickets', { params }),
  createTicket: (data) => axios.post('/tickets', data),
  updateStatus: (id, data) => axios.patch(`/tickets/${id}/status`, data),
  uploadImages: (id, formData) => axios.post(
    `/tickets/${id}/images`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
}; 