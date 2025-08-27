# 20250826_webcomponent_jrpg_buttle_game


## マスターデータの更新方法

Toolsフォルダにある、別途作成した「MasterDataSheetParser」コマンドを利用します。
マスターデータの大元となるデータはGoogle Sheetsで閲覧のみ公開URLとした「https://docs.google.com/spreadsheets/d/11ZHLpOBwHapq6Wtw7OaTx5oe78cGJzpvBdgnBUMmlYs/」にあり、ここにある必要なマスターデータ一式を指定することで最新のマスターデータjsonファイルを取得できます。

20250826現在、以下をターミナル実行することで整います。

```
./Tools/MasterDataSheetParser/MasterDataSheetParser sheetsApi "https://docs.google.com/spreadsheets/d/11ZHLpOBwHapq6Wtw7OaTx5oe78cGJzpvBdgnBUMmlYs/" --folder=MasterData --key=./secrets/sheets_api_service_account.json --cleanup messages commands inventories actors
```

