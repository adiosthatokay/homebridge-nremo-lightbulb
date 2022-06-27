# homebridge-nremo-lightbulb
[nillpo/homebridge-nremo](https://github.com/nillpo/homebridge-nremo)からフォーク
                          
Nature Remoで任意の赤外線信号を送信できるようにするプラグイン  
電球（Lightbulb）型のアクセサリを追加  
`max`, `high`, `low`, `off` の4パターンの信号を扱うことができる

# Configuration
```JSON
  "accessories": [
    {
      "name": "Room Lamp A",
      "accessory": "NatureRemo",
      "host": "Remo-XXXX.local",
      "path": "/messages",
      "delayBefore": 0,
      "delayAfter": 0,
      "timeout": 2000,
      "retry_interval": 500,
      "retry": 3,
      "s_max": { "format": "us", "freq": 38, "data": [] },
      "s_high": { "format": "us", "freq": 38, "data": [] },
      "s_low": { "format": "us", "freq": 38, "data": [] },
      "s_off": { "format": "us", "freq": 38, "data": [] },
      "command_order": [
        { "max": ["s_max", "s_high", "s_low"] },
        { "high": ["s_high"] },
        { "low": ["s_low"] },
        { "off": ["s_off"] }
      ]
    },
  ],
```
アクセサリの明るさを100％にすると`max`の信号を、51％～99％で`high`の信号を、1％～50％で`low`の信号を、0％で`off`の信号を送信する  

**以下フォーク元と同じ**  
>on/off時にcommand_orderのon/offごとの[]で指定したコマンドをdelayAfterで指定した時間ごとに送信する
>* delayBefore: コマンド送信前に指定時間分だけ待つ(Aアクセサリ実行後に実行後Bアクセサリ実行などのシーン利用時に便利)
>* delayAfter: on/off実行時に[]内のコマンドを指定時間ごとに送信できる(同時に送るとNature Remoが反応しない)
>* retry: リクエストが失敗したときに再試行する回数
>* retry_interval: 再試行するまでの時間
>* timeout: リクエストがタイムアウトするまでの時間
>
>**Nature Remoにアクセスがしばらくないと1回目のリクエスト時にタイムアウトするのでtimeoutで短めに設定するのがよさそう**
