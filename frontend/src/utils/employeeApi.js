import API from "./api";

/* GET all employees */
export const getEmployees = () =>
  API.get("/employees");

/* CREATE employee */
export const createEmployee = (data) =>
  API.post("/employees", data);

/* UPDATE employee */
export const updateEmployee = (id, data) =>
  API.put(`/employees/${id}`, data);

/* DELETE employee */
export const deleteEmployee = (id) =>
  API.delete(`/employees/${id}`);
