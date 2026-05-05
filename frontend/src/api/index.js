import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

export const authAPI = {
  register : (name, email, password) => api.post('/auth/register', { name, email, password }),
  login    : (email, password)        => api.post('/auth/login',    { email, password }),
  me       : ()                       => api.get('/auth/me'),
  update   : (data)                   => api.put('/auth/me', data),
}

export const documentsAPI = {
  upload : (file, onProgress) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: e => onProgress?.(Math.round((e.loaded * 100) / e.total))
    })
  },
  get  : id => api.get(`/documents/${id}`),
  list : ()  => api.get('/documents/'),
}

export const videosAPI = {
  generate : (document_id, voice, speed) => api.post('/videos/generate', { document_id, voice, speed }),
  retry    : id  => api.post(`/videos/${id}/retry`),
  list     : ()  => api.get('/videos/'),
  get      : id  => api.get(`/videos/${id}`),
  delete   : id  => api.delete(`/videos/${id}`),
}
