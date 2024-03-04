## Парсер для получения данных с сайта по ИНН

Данный парсер писался под бизнес задачу. Проблема заключалась в том, что был большой excel файл на 10 000 строк, который хранил компании. Нужно было заходить на сайт, вбивать ИНН и собирать номера телефонов, почту и ссылку на сайт. Парсер не обходит капчу, тк заказчик сазал, что данного варианта будет достаточно. 

<hr/>

Все библиотеки используемые при создании парсера описаны в файле package.json
<br/>
Парсер можнет демонстрировать свою работу через браузер Chrome. Если браузер установлен, то он обращается к нему, в инном случае есть протативный браузер (На данный момент он в .gitignire)

<hr/>

### Settings

Файл settings служит для более удобной настройки параметров:
- timeout. Задаёт время в секундах между запросами. На данный момент к этому параметру добавляется случайное кол-во секунд, чтобы капча попадалась реже
- startRow. Начальная строка с которой будет браться значение ИНН из исходной таблицы в папке file
- endRow. Конечная строка
- display. True - запускает браузер, False - вся работа происходит в фоне  