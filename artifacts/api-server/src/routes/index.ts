import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adforgeRouter from "./adforge";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(adforgeRouter);
router.use(storageRouter);

export default router;
