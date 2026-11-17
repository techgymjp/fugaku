# Google Play ストア掲載情報（下書き）

Play Console の「ストアの掲載情報」に貼り付けて使います。既定の言語を日本語にし、「翻訳を管理」から英語（en-US）を追加してください。
英語だけをまとめたテキストは `listing-en.txt` にあります。

## 画像（このフォルダ）

| 用途 | ファイル | サイズ |
| --- | --- | --- |
| アプリのアイコン | `icon-512.png` | 512 × 512 |
| フィーチャー グラフィック（日本語） | `feature-graphic.png` | 1024 × 500 |
| フィーチャー グラフィック（英語） | `feature-graphic-en.png` | 1024 × 500 |
| スマートフォンのスクリーンショット（日本語） | `ja-1-title.png` 〜 `ja-5-result.png` | 1920 × 1080 |
| スマートフォンのスクリーンショット（英語） | `en-1-title.png` 〜 `en-5-result.png` | 1920 × 1080 |

スクリーンショットは、上に見出し、下にゲーム画面を置いています。順番どおり（1 → 5）に登録してください。
見出しの文字のない画面写真は `raw/` にあります。作り直すときは `python3 tools/make_store_images.py`。

| # | 見出し（日本語） | 見出し（英語） | 画面 |
| --- | --- | --- | --- |
| 1 | 北斎の名画から　富士山が消えた！ | Mt. Fuji has vanished from Hokusai's prints! | タイトル |
| 2 | 富士山の輪郭を　指でなぞろう | Trace Fuji's outline with your finger | 出題（田子の浦をなぞっている途中） |
| 3 | 答えは星座のように　浮かび上がる | The answer appears like a constellation | 判定（100 点 ★★★神業！） |
| 4 | 神奈川沖浪裏も　全46図に挑戦 | The Great Wave and more — all 46 prints | 判定（神奈川沖浪裏） |
| 5 | 称号は　「画狂老人（北斎級）」 | Earn the rank "Old Man Mad About Painting" | 結果 |

---

## ASO（ストア内の検索）の考え方

Google Play にはキーワード欄がなく、**アプリ名・簡単な説明・詳しい説明**の言葉で検索にかかります。

- **アプリ名**：ゲーム名に、検索されやすい「北斎」「浮世絵」「パズル」を足しました（ホーム画面に出る名前は「富士山どこ？」のまま）
- **簡単な説明**：「北斎」「名画」「富士山」「浮世絵」「脳トレ」「パズル」「神奈川沖浪裏」「赤富士」を自然な文で入れました
- **詳しい説明**：ねらう言葉（下の表）を、詰め込みすぎない程度に 2〜4 回ずつ入れています。同じ言葉の不自然なくり返しは、Google のポリシーで減点の対象なので避けています
- **カテゴリ**：ゲーム ＞ パズル（「アート」で探す人には説明文の言葉で届く）
- **タグ**：パズル、トリビア、シングルプレーヤー、オフライン（Play Console で選べるもの）

| ねらう言葉（日本語） | ねらう言葉（英語） |
| --- | --- |
| 富嶽三十六景、葛飾北斎、北斎、浮世絵、富士山、名画、日本画、美術、アート、脳トレ、パズル、クイズ、神奈川沖浪裏、赤富士（凱風快晴） | Hokusai, Mount Fuji / Mt. Fuji, ukiyo-e, Thirty-six Views, Great Wave, Japanese art, woodblock print, art puzzle, brain training, trivia, painting |

---

## 日本語

**アプリ名**（30 文字以内）※ 25 文字

```
富嶽三十六景 富士山どこだっけ？ 北斎浮世絵パズル
```

**簡単な説明**（80 文字以内）※ 71 文字

```
北斎の名画から富士山が消えた！浮世絵に描かれた富士山の輪郭を指でなぞって当てる、アート×脳トレのなぞりパズル。神奈川沖浪裏・赤富士など全46図
```

**詳しい説明**

```
北斎の名画から、富士山が消えてしまった！

葛飾北斎の浮世絵「富嶽三十六景」は、どの絵のどこかに必ず富士山が描かれています。
でも、このゲームの絵には富士山がありません。
「たしか、このあたりに…」と思い出しながら、富士山があったはずの輪郭（稜線）を指でなぞってください。
判定すると、本当の富士山が現れ、輪郭が星座のように星を結んで浮かび上がります。

■ 遊び方
・富士山が消された浮世絵が表示されます
・富士山の稜線を指でなぞるだけ（何本かに分けてなぞってもOK）
・なぞった線が本物の輪郭にどれだけ重なったかで、0〜100点で採点
・なぞり残しも、はみ出しも減点。ぴったり重なれば「★★★神業！」
・制限時間は1問30秒。残りわずかになると時計のカチカチが速くなります

■ 富嶽三十六景 全46図を収録
・「神奈川沖浪裏」の大波の向こうの小さな富士山
・赤富士で知られる「凱風快晴」、雷鳴とどろく「山下白雨」
・桶の中に富士山がのぞく「尾州不二見原」、湖に映る逆さ富士の「甲州三坂水面」
・表富士36図と裏富士10図、あわせて46図。名所めぐりの気分で楽しめます
・作品名と読みがなも表示されるので、浮世絵や日本美術の入門にもぴったり

■ 3つのモード
・五問勝負：すきま時間にさくっと
・十問勝負：腕だめしに
・全図制覇：46図すべてに挑戦
・モードごとのベスト記録を保存

■ 称号を目指そう
「駆け出しの絵師」「江戸の旅人」「富士見の達人」、そして北斎の画号にちなんだ最高の称号「画狂老人（北斎級）」まで。
記憶力と観察力をきたえる、大人の脳トレにも。

■ その他
・琴の音色の和風BGMと効果音
・結果を友だちにシェア
・日本語・英語に対応
・オフラインでも遊べます（広告・シェアは通信が必要）

あなたは、北斎の富士山をどこまで覚えていますか？
```

---

## English

**App name** (max 30 characters) — 29 characters

```
Where's Mt. Fuji? Hokusai Art
```

**Short description** (max 80 characters) — 78 characters

```
Mt. Fuji vanished from Hokusai's ukiyo-e! Trace its outline in 46 art puzzles.
```

**Full description**

```
Mount Fuji has vanished from Hokusai's masterpieces!

Every print in Katsushika Hokusai's famous ukiyo-e series "Thirty-six Views of Mount Fuji" hides Mt. Fuji somewhere in the scene. In this game, Fuji has been erased.
Remember where it was, and trace the outline of its ridgeline with your finger. Then check your answer — the real Mount Fuji returns, and its outline lights up like a constellation.

■ HOW TO PLAY
• A Hokusai print appears with Mount Fuji erased
• Trace Fuji's ridgeline with your finger (several strokes are fine)
• You score 0–100 by how closely your line matches the real outline
• Missing parts and stray lines both cost points — a perfect match is "★★★ Masterful!"
• 30 seconds per print, with a ticking clock that speeds up as time runs out

■ ALL 46 PRINTS OF THE THIRTY-SIX VIEWS
• The tiny Fuji behind "The Great Wave off Kanagawa"
• "South Wind, Clear Sky" (Red Fuji) and "Rainstorm Beneath the Summit"
• Fuji framed inside a giant barrel, and Fuji reflected upside-down in Lake Kawaguchi
• All 36 main views plus the 10 additional prints — 46 in total
• Titles are shown in English and Japanese: a fun way to discover Japanese art and woodblock prints

■ THREE MODES
• 5 Prints: a quick game
• 10 Prints: test your skill
• All Prints: take on all 46
• Best scores saved for each mode

■ EARN YOUR RANK
From "Apprentice Artist" and "Edo Traveler" to "Master Fuji-Watcher" — and the top rank, "Old Man Mad About Painting," one of Hokusai's own art names.
A relaxing brain-training puzzle for memory and observation.

■ FEATURES
• Calm Japanese koto music and sound effects
• Share your results with friends
• English and Japanese
• Plays offline (ads and sharing need a connection)

How well do you remember Hokusai's Mount Fuji?
```

---

## Play Console「アプリのコンテンツ」の回答の目安

- **プライバシー ポリシー**: https://techgym.jp/privacy-policy/
- **広告**: 「はい、広告を含みます」
- **アプリのアクセス権**: 「制限なし（ログイン不要）」
- **広告 ID**: 「使用する」（目的は「広告またはマーケティング」と「アナリティクス」）
- **ターゲット ユーザー**: 13 歳以上（13 歳未満を含めると広告に制限がかかる）
- **データ セーフティ**: アプリ自体は個人情報を集めないが、Google AdMob が「デバイスまたはその他の ID（広告 ID）」と「アプリの操作（広告の表示・クリック）」を広告とアナリティクスの目的で収集・共有する。通信は暗号化されている。※ AdMob の公式ガイドに従って最終確認すること
- **コンテンツのレーティング**: ゲーム（パズル）。暴力・性的表現・ギャンブル・ユーザー間のやり取りなし
- **カテゴリ**: ゲーム ＞ パズル
- **連絡先メール・ウェブサイト**: テックジムの共通のもの

## メモ

- 北斎の原画はパブリックドメインです。富士山を消した絵・正解の輪郭線・ゲームはテックジムのオリジナルです
- 公開記事や掲載文に GitHub の URL は載せない
- リリースノート（初回）の例：`<ja-JP>初回リリース</ja-JP>` `<en-US>First release</en-US>`
