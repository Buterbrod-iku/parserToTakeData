const stealth = require("puppeteer-extra-plugin-stealth");
const puppeteer = require("puppeteer-extra");
const { HttpsProxyAgent } = require('https-proxy-agent');
const { JSDOM } = require("jsdom");
const fs = require("fs");
const csv = require("csv-parser");
const { executablePath } = require("puppeteer");
const input = require("input");
const UserAgent = require("user-agents");
const { stringify } = require("csv-stringify");
const p = require("path");
const ExcelJS = require("exceljs")


async function main() {
  puppeteer.use(stealth());
  process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

  const settings = JSON.parse(fs.readFileSync("./setting.json", "utf-8"));

  const path = p.join("file", fs.readdirSync("./file")[0]);

  try {
    fs.readFileSync(path, "utf-8");
  } catch (err) {
    console.log(err);
    main();

    return;
  }

  //const path = "C:/Users/danii/Downloads/leadТ.csv";

  class HTMLDocument extends JSDOM {
    constructor(html) {
      const DOM = super(html);

      return this.#init(DOM);
    }
    #init(DOM) {
      return DOM.window.document;
    }
  }

  class CSVController {
    static parse(filePath) {
      const result = [];

      return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv({ separator: ";" }))
          .on("data", (data) => result.push(data))
          .on("end", () => {
            resolve({ data: result, headers: Object.keys(result[0] || {}) });
          });
      });
    }
  }

  const LAUNCH_PUPPETEER_OPTS = {
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
      "--window-size=1920x1080",
    ],
    headless: !settings.display,
  };

  const PAGE_PUPPETEER_OPTS = {
    waitUntil: "load",
    timeout: 3000000,
    executablePath: executablePath(),
  };

  class PuppeteerHandler {
    constructor() {
      this.browser = null;
    }
    async initBrowser() {
      this.browser = await puppeteer.launch(LAUNCH_PUPPETEER_OPTS);
    }
    async closeBrowser() {
      await this.browser.close();

      this.browser = null;
    }
    async getPageContent(item, timeout = 1300) {
      if (!this.browser) {
        await this.initBrowser();
      }

      await new Promise((resolve) =>
        setTimeout(
          resolve,
          1000 * settings.timeout + settings.timeout * Math.random()
        )
      );

      try {
        const page = await this.browser.newPage();

        await page.setUserAgent(new UserAgent().random().toString());

        await page.goto("https://www.rusprofile.ru/", PAGE_PUPPETEER_OPTS);

        await page.waitForSelector(".index-search-input");

        await page.evaluate((item) => {
          document.querySelector(".index-search-input").value = item.ИНН;

          document.querySelector('[type="submit"].search-btn').click();
        }, item);

        await page.waitForNavigation();

        const isList = await page.evaluate(async () => {
          const $node = document.querySelector(".company-item__title a");

          if ($node) {
            await new Promise((resolve) => setTimeout(resolve, 10000));

            $node.click();

            return true;
          }

          return false;
        });

        if (isList) {
          await page.waitForNavigation();
        }

        await page.evaluate(async () => {
          const url = new URL(window.location.href);

          url.searchParams.set("utm_source", "tender-win.ru");

          await new Promise((resolve) => setTimeout(resolve, 10000));

          window.location.href = url.toString();
        });

        await page.waitForNavigation();

        const result = await page.evaluate(() => {
          const phone = Array.from(
            document.querySelectorAll('[itemprop="telephone"]')
          )
            .map((item) => {
              return item?.href?.replace("tel:", "");
            })
            .join(", ");

          const email = document
            .querySelector('[itemprop="email"]')
            ?.href?.replace("mailto:", "");

          const url = window.location.href;

          return { phone, email, url };
        });

        console.log("!!!!!!!!!!!!!!!!!!!!!!");
        console.log(result);
        console.log("!!!!!!!!!!!!!!!!!!!!!!");

        let phoneNumbers = result.phone

        if (phoneNumbers.length > 0) {
          let split = phoneNumbers.split(",")
          let result = []

          for (let i = 0; i < split.length; i++) {
            if (split[i][0] !== '%'){
              result.push(split[i])
            }
          }

          let stringPhone = ""
          for (let i = 1; i < result.length; i++) {
            stringPhone += result[i].slice(1, result[i].length)
            stringPhone += ", "
          }
          stringPhone = stringPhone.slice(0, -2)

          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.readFile("promise.xlsx")

          new Promise((res, rej) => {
            workbook.eachSheet((worksheet, sheetId) => {

              res((worksheet.getCell(`A${item['﻿ID']}`).value = item["Название лида"]));
              res((worksheet.getCell(`B${item['﻿ID']}`).value = item["ИНН"]));
              res((worksheet.getCell(`C${item['﻿ID']}`).value = stringPhone));
              res((worksheet.getCell(`D${item['﻿ID']}`).value = result.email));
              res((worksheet.getCell(`E${item['﻿ID']}`).value = result.url));
              worksheet.commit();
            })
          }).then(workbook.xlsx.writeFile("promise.xlsx"))
        }
        else {
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.readFile("promise.xlsx")

          new Promise((res, rej) => {
            workbook.eachSheet((worksheet, sheetId) => {

              res((worksheet.getCell(`A${item['﻿ID']}`).value = item["Название лида"]));
              res((worksheet.getCell(`B${item['﻿ID']}`).value = item["ИНН"]));
              res((worksheet.getCell(`C${item['﻿ID']}`).value = ""));
              res((worksheet.getCell(`D${item['﻿ID']}`).value = result.email));
              res((worksheet.getCell(`E${item['﻿ID']}`).value = result.url));
              worksheet.commit();
            })
          }).then(workbook.xlsx.writeFile("promise.xlsx"))
        }

        item["Рабочий телефон"] = result.phone;
        item["Частный e-mail"] = result.email;
        item["Корпоративный сайт"] = result.url;

        await page.close();

        return item;
      } catch (err) {
        console.log(err);
      }
    }
  }

  const app = new PuppeteerHandler();

  const data = (await CSVController.parse(path)).data;

  let dataRange = data.slice(settings.startRow - 1, settings.endRow)

  const list = [];

  async function parse(err) {
    const item = await dataRange.shift();

    console.log("item");
    console.log(item);
    console.log("item");

    console.log(err);

    if (!item) {
      stringify(
        list.reduce((acc, item) => {
          if (!acc.length) {
            acc.push(Object.keys(item));
          }

          acc.push(Object.values(item));

          return acc;
        }, []),
        { delimiter: ";" },
        (err, output) => {
          fs.writeFileSync(
            `./result/result_${new Date().getTime()}.csv`,
            output
          );
        }
      );

      console.log("finish");

      return;
    }

    try {
      const result = await app.getPageContent(item);

      list.push(result);

      parse();
    } catch {
      parse();
    }
  }

  parse();

  process.on("uncaughtException", console.log);
  process.on("unhandledRejection", console.log);
}

main();
