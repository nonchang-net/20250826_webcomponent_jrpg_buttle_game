# commands.jsonマスターについて

inventoriesマスターで指定されているcommand_id配列は、ゲーム中の挙動を指定する。
基本コマンドは以下の通り。

```tsv
2d7789cf-e8ab-40be-a99b-eef9d824dbf4	定数加算	Add	Aレジスタにarg1の値を加える
f30647ff-eedb-4c2b-bc43-0f2883055961	定数乗算	Multiply	Aレジスタをarg1で乗算する
98cefa6c-a925-4f5b-95b3-90962ac31d42	乱数加算	RandomAdd	0〜arg1未満までの範囲の乱数をAレジスタに加算する
34e0a3a6-641a-4602-9f93-3eadfcaa5df8	攻撃点ルール適用	ApplyAttack	"Aレジスタを攻撃点とした汎用攻撃ダメージルールを適用
・行動者の「攻撃力合計・バフデバフ状態」を加味
・対象者の「防御力合計・バフデバフ状態」を加味
＋効果反映実行"
d9d76f5b-a9a5-4493-aae6-a93126fdf8bd	複数回攻撃ルール設定	SetMultipleAttack	arg1の値で複数回攻撃ルールを設定
45d03551-9956-4fd4-bde2-b94b58dc0a78	ランダムターゲット設定	SetRandomTarget	ランダムな相手をターゲットに設定する
23ca1336-358d-461b-8e74-20beebe59f98	全体ターゲット設定	SetWholeTarget	効果対象を全体に設定する
9a46d8c2-6e5d-4330-9cc7-00c3e042a863	攻撃属性「火」設定	SetAttackAttributeFire	攻撃の属性を火に設定
7519e60f-4e6b-4470-a47e-3c369819f900	MP評価	EvaluateMagicPoint	arg1のMPが足りてるか評価、足りていなければ中断、足りていれば消費して継続
ec62a0e2-a713-40d6-8d99-749a755c6cd3	消費型アイテム評価	EvaluateConsumeQuantity	arg1のinventoryアイテム消費個数評価（通常は1を想定）、不足していれば中断、足りていれば消費して継続
5dcdb9c0-28a3-4bc4-9325-3f141d600091	魔法回復ルール適用	ApplyMagicHeal	"Aレジスタを基本点として魔法回復ルール適用
・詠唱者の「信仰心」ボーナス適用
・対象者の「魔法回復減衰デバフ」状態があれば適用
＋効果反映実行"
493bcef4-e7db-4261-91dc-f4fe8b35c88d	薬草回復ルール適用	ApplyItemHeal	"Aレジスタを基本点として薬効回復ルール適用
・利用者の「薬剤師」スキルボーナス適用
・対象者の「薬効減衰デバフ」状態があれば適用
＋効果反映実行"
d2c69c4c-a333-432a-9b93-192457ea2b56	メッセージ表示	ShowMessage	arg1のメッセージを表示する
```

## サブコマンドによるマクロ定義

sub_commands配列を持つコマンドは、複数の基本コマンドを連続で実行するマクロとなる。
サブコマンドのarg列に「arg1」「arg2」「arg3」が指定されている場合は、inventoriesマスタの「arg1」「arg2」「arg3」のどれを基本コマンドのarg1に渡すかを指定している。
薬効回復マクロのように、1個消費することを直指定する場合もある。