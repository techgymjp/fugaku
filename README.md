# 富嶽三十六景　富士山どこだっけ？

葛飾北斎「富嶽三十六景」から富士山が消えてしまった！
星座をなぞるように、富士山があったはずの**シルエットの輪郭（稜線）**をなぞって当てるWEBゲームです。

## 遊び方

1. 富士山が消された浮世絵が表示されます。
2. 富士山の輪郭をドラッグ／指でなぞります（複数の線に分けてもOK）。
3. 「判定」で本物の富士山と輪郭線が星座のように現れ、一致度で採点されます。
   なぞり残し（カバー率）とはみ出し（正確さ）の両方を見ています。

## 言語

日本語と英語に対応しています。最初はブラウザの言語設定に合わせ、右上の「EN / 日本語」で切り替えられます（選んだ言語はブラウザに保存）。
URL に `?lang=en` / `?lang=ja` を付けて指定することもできます。画面の文言は `js/i18n.js`、作品の英題は `js/prints.js` の `en` にあります。

## ファイル構成

| パス | 内容 |
| --- | --- |
| `index.html` | ゲーム本体 |
| `editor.html` | 正解の輪郭線を作るエディタ |
| `js/prints.js` | 全46図のタイトル・読み・ID |
| `js/outlines.js` | 正解の輪郭線データ（エディタで書き出したもの） |
| `js/scoring.js` | なぞった線と正解の一致度の計算 |
| `images/original/<id>.jpg` | 原画（答え合わせ用） |
| `images/nofuji/<id>.jpg` | 富士山を消した絵（出題用） |

`<id>` は `js/prints.js` の `id`（例: `kanagawa`, `gaifu`, `sanka` …）。
原画と富士山なし画像は**同じ寸法・同じ構図**にしてください（座標を共有するため）。

## 輪郭線の作り方

1. `images/original/` と `images/nofuji/` に画像を置く
2. ローカルサーバで `editor.html` を開く（例: `python3 -m http.server` → http://localhost:8000/editor.html）
3. 絵を選び、富士山の稜線に沿ってクリックで点を打つ（ドラッグで移動・右クリックで削除・`N` で別の線）
4. 「outlines.js を書き出し」でダウンロードしたファイルで `js/outlines.js` を置き換える

輪郭線が登録された絵だけが出題されます。

## 公開

GitHub Pages（ブランチ `main` / ルート）でそのまま公開できます。ビルドは不要です。

## 富士山を消した絵の作り方

`images/nofuji/` の画像は、原画と正解の輪郭線から自動で作っています。

```bash
pip install opencv-python-headless numpy
python3 tools/make_nofuji.py            # 全図
python3 tools/make_nofuji.py kanagawa   # 指定した図だけ
```

稜線と、図ごとに指定した「富士山の下端」で囲んだ範囲を、周りの空や背景の色で塗りつぶします。
図ごとの調整は `tools/make_nofuji.py` の `OVERRIDES` にあります。
輪郭線を直したときは、このスクリプトを再実行してください。

## テスト

```bash
node tools/test-scoring.js
```

## 画像について

北斎の原画はパブリックドメインです。画像は Wikimedia Commons などから取得できます。

## Android アプリ

[Capacitor](https://capacitorjs.com/) でゲームのファイルをアプリに同梱し、Android アプリにしています（オフラインで遊べます）。
構成は techgymjp/jet-fighter の `docs/ANDROID_PORTING.md`、techgymjp/jackal と同じです。

- パッケージ名: `jp.techgym.fugaku`
- 横画面固定・全画面・プレイ中は画面を消さない
- 一時停止: 出題中の ⏸ ボタン・戻るボタン・別アプリへの切り替えで止まる（制限時間も止まり、絵は隠れる）
- 戻るボタン: 出題中は一時停止（一時停止中なら再開）、あそびかたはタイトルへ、タイトル・結果画面ではアプリを終了
- シェア: 結果画面の「結果をシェア」で Android の共有メニュー（紹介記事 https://techgym.jp/column/claude-code-game-fugaku/ のリンクつき）
- 広告（AdMob）
  - バナー: タイトル・あそびかた・一時停止・結果画面の下中央（出題中は絵や操作ボタンと重なるので出さない）
  - 全画面広告（インタースティシャル）: プレイを始める（タイトル・あそびかたから）、タイトルへ戻る（あそびかた・一時停止・結果画面から）、一時停止からの再開、結果画面の「もう一度」のたびに毎回
  - リワード広告（チート）: 外した絵（65 点未満）で「広告を見てこの絵をやり直す」（1 ゲーム 5 回まで。答えの輪郭が描き終わるのを見届けられるよう 2.5 秒後に出し、6 秒で自動的に消える）。
    見終わるとその絵の成績を取り消して、同じ絵をもう一度。使ったことは結果画面とシェア文に「やり直しN回」と出る
  - EU など同意が必要な地域ではタイトル画面に「広告の設定」
- タイトル画面にバージョン（ビルド番号）・プライバシーポリシーへのリンク・モードごとのベスト記録

ビルドは GitHub Actions（`.github/workflows/android.yml`）で行います。

1. `npm ci` → `npm run build:app`（`www/` に Web ファイルをコピーし、Web 版だけの部分〔動作確認用の `?time=` `?lang=`〕を取り除き、`js/ads-config.js` と `js/build-info.js` を生成）→ `npx cap sync android` → `./gradlew assembleDebug`
2. 既定ブランチなら、Release `android-latest` の `fugaku.apk` を差し替え（動作確認用・テスト広告）
   - リリース画面: `https://github.com/techgymjp/fugaku/releases/tag/android-latest`（QR コード: `docs/apk-qr.png`）
   - APK 直接: `https://github.com/techgymjp/fugaku/releases/latest/download/fugaku.apk`
3. GitHub Secrets に署名鍵（`ANDROID_KEYSTORE_BASE64` / `ANDROID_KEYSTORE_PASSWORD` / `ANDROID_KEY_ALIAS` / `ANDROID_KEY_PASSWORD`）があれば、本番広告で署名付き AAB を作り Artifact に上げる

AdMob のアプリ ID は `android/app/src/main/res/values/strings.xml` の `admob_app_id`、本番の広告ユニット ID は `js/ads.js` の `UNITS.android.production` にあります。
本番の広告ユニット ID が空の種類は、Google Play 用の AAB では出しません（そろうまでも先にビルドできるようにするため）。
動作確認用 APK はどれもテスト広告、Google Play 用の AAB は本番の広告です。

手元で試すとき: `npm install` → `npm run android:sync` → `npm run android:open`（Android Studio が必要）。
アイコンと起動画面は `python3 tools/make_icons.py` で `assets/` に元画像を作り、`npx @capacitor/assets generate --android` で生成しています。

Web 版（GitHub Pages）はこれまでどおりリポジトリのルートをそのまま公開しています（ビルド不要。Capacitor がないので広告などは動きません）。

## ライセンス

著作権はテックジム株式会社に帰属します（All rights reserved）。許可なく複製・改変・再配布すること、Web サイトやアプリとして公開・販売すること、名前・アイコン・画像を使うことを禁止します。
テックジムの受講生が学習目的で複製・改変することは許可します（アプリストアでの公開・広告の掲載・販売などの商用利用は不可）。
葛飾北斎の原画（`images/original/`）はパブリックドメインです。詳しくは `LICENSE` を見てください。
