import { Transform } from "class-transformer"
import * as moment from 'moment';


export const DateTransform = () => {
    return Transform(({ value }) => moment(value).format("YYYY-MM-DD HH:mm:ss"))
}