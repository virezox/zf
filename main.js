const axios = require("axios");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const qs = require("qs");
const winston = require("winston");
require("dotenv").config();

const auth = require("./auth.js");

const zf_id = process.env.ZF_ID;
const bark_key = process.env.BARK_KEY;
const strs = process.env.STRS;

dayjs.extend(timezone);
dayjs.extend(utc);
const tz = "Asia/Shanghai";

const customFormat = winston.format.printf(({ message }) => {
  return `${message}`;
});

const dateStr = dayjs.utc().tz(tz).format("YYYYMMDD");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(winston.format.timestamp(), customFormat),
  transports: [
    new winston.transports.File({ filename: "zfrontier" + dateStr + ".log" }),
  ],
});

axios
  .get("https://www.zfrontier.com/app/mch/" + zf_id)
  .then(function (response) {
    resp = response.data;
    lines = resp.split("\n");
    let csrf_token;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("csrf_token")) {
        const regex = /'(.*?)'/;
        const result = lines[i].match(regex);
        csrf_token = result[1];
        break;
      }
    }

    body = {
      ...auth(csrf_token),
      id: zf_id,
    };

    axios({
      method: "post",
      url: "https://www.zfrontier.com/v2/mch/info",
      data: qs.stringify(body),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Csrf-Token": window.csrf_token,
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        "X-Client-Locale": "zh-CN",
        "Sec-Ch-Ua-Platform": "macOS",
        Accept: "application/json, text/plain, */*",
        Connection: "keep-alive",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en;q=0.9",
      },
    }).then(function (response) {
      orders = response.data.data.resell_orders;
      if (Array.isArray(orders)) {
        logger.info(dayjs.utc().tz(tz).format("YYYY-MM-DD HH:mm:ss"));
        orders.forEach((o) => {
          const message = o.desc + "       ¥" + o.price;
          logger.info(message);
          substrings = strs.split(",");

          if (substrings.some((substring) => o.desc.includes(substring))) {
            axios({
              method: "post",
              url: "https://api.day.app/push",
              data: {
                device_key: bark_key,
                body: message,
                title: "ZF 转单",
                sound: "bell",
                badge: 1,
                group: "zFrontier",
                icon: "https://img.zfrontier.com/ui/icon/favicon.ico",
                url: "https://www.zfrontier.com/app/mch/BP9xRLrAJXz1",
                isArchive: 1,
              },
              headers: {
                "Content-Type": "application/json; charset=utf-8",
              },
            });
          }
        });
        logger.info("");
        logger.info("");
      }
    });
  });
