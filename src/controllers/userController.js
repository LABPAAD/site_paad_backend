import { UserService } from "../service/userService.js";

export const createUser = async (req, res) => {
    try {
        const user = await UserService.create(req.body);
        return res.status(201).json(user);
    } catch (error) {
        return res.json(error);
    }
};

export const getAllUsers = async (req, res) => {
    try {
        const users = await UserService.getAllUsers();
        return res.json(users);
    } catch (error) {
        return res.json(error);
    }
};

export const getUserByRole = async (req, res) => {
    try {
        const user = await UserService.getUserByRole(req.body);
        return res.json(user);
    } catch (error) {
        return res.json(error);
    }
};

export const getUserByAdvisor = async (req, res) => {
    try {
        const user = await UserService.getByAdvsiorId(req.body);
        return res.json(user);
    } catch (error) {
        return res.json(error);
    }
};

export const updateData = async (req, res) => {
    try {
        const updatedData = await UserService.updateData(req.body);

        return res.status(200).json(updatedData);
    } catch (error) {
        return res.json(error);
    }
};