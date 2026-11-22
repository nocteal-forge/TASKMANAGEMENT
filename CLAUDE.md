# タスク管理アプリ(TASKMANAGEMENT)

個人用の Web アプリ。「今日・明日・今週・完了」の4分類でタスクを管理する。RaiseTech 初級編の学習の一環として、要件定義 → 設計 → 技術選定 → 実装の順で進める。構成はフロントエンド / API / データベースの3階層。

## ドキュメント(docs/)

| ファイル | 役割 |
| --- | --- |
| requirements.md | 概要・背景・目的・非機能要件・未決定事項・用語集 |
| functional-requirements.md | 機能一覧 |
| screen-design.md | 画面設計(画面一覧、画面遷移、ユースケース、画面仕様、状態、操作方法) |
| database-design.md | DB 設計(テーブル、項目、ER 図、schema.sql・Entity との対応) |
| tech-stack.md | 技術スタック、システム構成、公開方針、認証(1〜4 章)。技術選定の経緯と比較(5〜9 章。2026-11-18 に再開。講義9を基準に検討中) |

2026-11-21 に、docs を 8 ファイルから 5 ファイルに再編成した(旧ファイルとの対応は、requirements.md 3 章)。

ラベル: 【確定】=承認済み / 【提案】=承認待ち / 【未決定】=要検討。

## 進め方のルール

- 実装の前に、docs の要件・設計を読んで確認する。
- 【確定】の内容を、承認なしに変更しない。未指定の機能や技術を、決定済みとして扱わない。
- 設定やファイルを変更する前に、変更内容と影響範囲を示し、承認を得てから行う。
- 技術選定は、2026-11-18 に再開した(講義9を基準)。React、JavaScript、Vite、dnd-kit、CSS Modules、Java、Spring Boot、Gradle、REST API、PostgreSQL は、採用候補(【提案】)。講義が続いているため、最終確定は、講義の終了後に、ユーザーの承認を得て行う。TypeScript と Next.js は採用対象外、パッケージ管理は npm(【確定】)。
- コードの作成は、技術選定の最終確定(講義の終了後)までは、次の例外に限る。(1) prototype/ 内の HTML / CSS / JavaScript の画面プロトタイプ。(2) 2026-11-20 にユーザーが承認した、講義10〜12 に沿った**試行実装**(backend/、frontend/、docker-compose.yml)。試行実装は、DB → バックエンド → API → フロントエンド → 連携・動作確認の順に、段階ごとの承認を得て進める。試行に使う技術は【提案】のままで、採用確定ではない。

## コマンドの実行

- 実行前に、コマンドの意味と実行内容を、初学者向けに説明する。
- 削除系の操作は、対象を確認してから行う。
- バイパスモードは使わない(通常の権限確認モード)。
- 権限設定は、~/.claude/settings.json(共通)と .claude/settings.json(このプロジェクト)にある。

## Git

### 基本ルール

- Git のコマンドは、ユーザーが明示的に依頼したときだけ実行する。通常のファイル編集や開発作業では、勝手に commit や push を実行しない。
- 状態確認・差分確認などの読み取りは、設定の範囲内で実行してよい。
- 自動実行(次節)に該当しない Git 操作(ブランチ操作など)は、実行前に、必要な操作を説明し、依頼内容を確認してから実行する。
- 自動実行の範囲では、「コマンドの実行」節の「実行前の説明」と、上記の「実行前の確認」を省き、最後の報告で、何をしたかを説明する(この節の定めを優先する)。
- `git init` は実行済み(ローカルの Git リポジトリ)。ブランチは main。
- 想定する送り先: origin = https://github.com/nocteal-forge/TASKMANAGEMENT.git、ブランチ = main(公開リポジトリ)。

### 自動実行(音声入力向け)

次のような、明示的な指示があった場合に限り、下記の手順を一連の流れで実行する。指示が曖昧な場合は、実行せず、確認する。

| 指示の例 | 実行する範囲 |
| --- | --- |
| 「コミットして」 | commit まで(push しない) |
| 「コミットプッシュして」「commitしてpushして」「変更をGitHubに上げて」「GitHubに反映して」 | commit と push |
| 「pushして」 | 既存のコミットの push のみ。未コミットの変更がある場合は、自動で commit せず、確認する |

#### 手順(commit する場合)

1. git status で作業状態を確認
2. git diff で変更内容を確認
3. git diff --cached でステージング済みの変更を確認
4. 機密情報・認証情報・.env・秘密鍵などが含まれていないか確認(ファイル名と差分の内容で判断する。「パスワード」という語が、ドキュメントの説明として出てくるだけの場合は、問題としない)
5. 不要なファイルや、意図しない変更がないか確認
6. 問題がなければ、必要なファイルを指定して git add(.gitignore で除外されたファイルは登録しない)
7. 変更内容に合ったコミットメッセージを、日本語で作成(1行目に要約、必要なら箇条書き)
8. git commit を実行
9. 「コミットして」の場合は、ここで終了し、10・11 へ。それ以外は、git push を実行(送り先が、上記の想定と一致していることを確認してから)
10. git status と git log で完了状態を確認
11. 結果を日本語で報告(コミットの ID、含まれたファイル、push 先、作業ツリーの状態)

#### 手順(「pushして」だけの場合)

1. git status で、未コミットの変更がないことを確認(ある場合は、commit せず、確認する)
2. push されていないコミットの内容(git log と差分)を確認し、手順 4・5 と同じ観点で、機密情報や意図しない内容がないか確認
3. 送り先が、想定と一致していることを確認し、git push を実行
4. git status と git log で完了状態を確認し、結果を日本語で報告

### 自動実行を中断して確認する条件

- 機密情報や認証情報が含まれている可能性がある
- .env、秘密鍵、トークンなどが、Git 管理の対象になっている
- 意図しない大量の変更や削除がある(目安: 削除されるファイルがある、または 20 ファイル・1,000 行を超える変更)
- マージ競合が発生している
- リモートブランチとの履歴に不整合がある(push 前に、ローカルとリモートの差を確認する。pull は自動では行わない)
- commit や push が失敗した(オプションを変えた再試行は、しない)
- どのファイルを登録すべきか判断できない
- push 先が、想定している GitHub リポジトリと異なる
- force push が必要になる状況

### 禁止事項

- git push --force、git push -f(--force-with-lease を含む)
- git reset --hard、git clean
- 履歴を書き換える操作(commit --amend、rebase、reset など)
- ユーザーの許可がない、GitHub リポジトリの新規作成・削除
- リモート URL の無断変更(git remote add / set-url / remove など)
- 認証情報の表示や記録

### 権限設定との関係

- CLAUDE.md の記述は、Claude Code の権限設定を変えない。プロジェクト設定(.claude/settings.json)で、git add / commit / push などは「確認」になっているため、自動実行の途中でも、確認が出る。

## 試行実装の進捗(2026-11-22 時点)

詳細は、docs/database-design.md 7 章と、各 docs 冒頭の「実装の状態(試行)」を参照。以下は、記録の要約。

- 完了(確認済み): frontend/ の初期環境(2026-11-21)。Phase A(`.env`、`.env.example` の用意。`.env` は Git 管理対象外)。Phase B(PostgreSQL 17 の起動、healthy、テーブル 2・制約 6 の確認、ボリュームを残した再起動後の維持と schema.sql の再実行なし)。Phase C(Spring Boot の起動、PostgreSQL への接続、8080 番の待ち受け)
- ユーザーの報告にもとづく判断: Hibernate の `validate` の成功(ユーザーが報告した起動ログと設定値にもとづく。起動ログ全文は、未確認)
- 未検証: `DEFERRABLE` の動作、Repository 経由のデータの読み書き、コンテナを作り直した場合のデータの維持。`TaskmanagementApplicationTests` は保留
- 未実装: API、Controller、Service、認証、タスク登録機能
- 起動時の注意: Spring Boot は `.env` を自動では読まない。ユーザーが、起動する端末で `.env` を読み込んでから `./gradlew bootRun` を実行する(`.env` の中身と環境変数は表示しない)。Docker は PATH にないため、Claude Code からは、フルパス(`/Applications/Docker.app/Contents/Resources/bin/docker`)で実行する。`docker compose up` でイメージを取得するときは、ユーザーの端末で、その端末だけ PATH に Docker のフォルダを追加して実行する

## 権限設定の検証状況(2026-11-17)

プロジェクト設定(.claude/settings.json)は、2026-11-17 に、Git の自動実行向けに更新した(allow 5 / ask 12 / deny 11)。以下は、実際に動かして確認できたことと、未検証のことを区別して記録する。

### 実際に確認済み

- ユーザー設定の `Bash(rmdir *)` の拒否が、セッションに適用されている。
- `git add`: 確認なしで実行できる。
- `git commit`: 確認なしで実行できる。
- `git commit -F -` によるヒアドキュメント形式: 確認なしで実行できる。
- `git push origin main`: 確認なしで実行できる。
- `git push -u origin main`: 確認なしで実行できる。
- `git status -sb` などの引数付きの読み取り操作(`git diff --cached --stat`、`git rev-list --left-right --count`、`git remote get-url origin`、`git log --oneline -3` など): 確認なしで実行できる。
- force push は拒否される(`git push origin main --force`、`git push --force-with-lease`、`git push -f origin main` の3形式。`--dry-run` を付けて確認)。通常の push は、誤って拒否されない。

### 未検証

- `Read` による `.env` の読み取り拒否(対象ファイルが存在せず、動作を証明できていない)。
- ユーザー設定の allow 4つ(git status / diff / log / show)が、設定の許可として効いているかどうか(組み込みの読み取り専用の扱いで通っている可能性があり、区別できていない)。
- ask の12項目(`git init`、`git checkout`、`git merge`、`git branch`、`git reset`、`git stash`、`git remote` の変更系、`gh repo`)の動作。
- deny の、force push 以外の項目(リモートブランチの削除、強制的な `git add`、`commit --amend`、`rebase`、`filter-branch` など)の実際の動作。
- その他のコマンド形式や、例外的なケース。

### 環境の制約

- `/status` と `/permissions` は、この環境で使えない。
