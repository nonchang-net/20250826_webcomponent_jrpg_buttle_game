# 20250826_webcomponent_jrpg_buttle_game

## 概要

web標準で作成したドラゴンクエスト風のバトルシーンwebアプリです。
claude codeの運用テストで作成したものです。

github pagesにて動作物を公開しています。
https://nonchang-net.github.io/20250826_webcomponent_jrpg_buttle_game/

## ライセンス

CC0です。ご自由にどうぞ。
内容については一才補償しませんのでご留意ください。


## 実行方法

web標準で構成していますのでビルドなどは不要です。
ローカルであればローカルwebサーバ環境で確認できる環境であれば動作すると思いますが、VSCodeのLive Previewなどではweb components系のアクセスを有効化する必要があるかもしれません。


## マスターデータの更新方法

Toolsフォルダにある、別途作成した「MasterDataSheetParser」コマンドを利用します。
このコマンドは
https://github.com/nonchang-net/20250825_masterdata_sheet_parser_cs
こちらのリポジトリでビルドしたC#製のツールです。

マスターデータの大元となるデータはGoogle Sheetsで作成しており、サービスアカウントを作成してシートに権限付与し、secretsフォルダに配置することで機能します。
シートの構成サンプルとして、閲覧のみ公開URLとしたシート「https://xxxxx」を用意しました。詳細説明は割愛しますが、内容については一切の権利を主張しません。CC0扱いでどうぞ。内容について一切の保証は致しませんが、何かのご参考になれば幸いです。

実行例（サービスアカウントとjson配置などが必要なためこのURL指定では動作しません）

```
./Tools/MasterDataSheetParser/MasterDataSheetParser sheetsApi "https://docs.google.com/spreadsheets/d/11ZHLpOBwHapq6Wtw7OaTx5oe78cGJzpvBdgnBUMmlYs/" --folder=MasterData --key=./secrets/sheets_api_service_account.json --cleanup messages commands inventories actors
```

