import axios from "axios"

const API = axios.create({
  baseURL: "http://192.168.0.158:3000/auth",
  headers: {
    "Content-Type": "application/json"
  }
})

export default API
