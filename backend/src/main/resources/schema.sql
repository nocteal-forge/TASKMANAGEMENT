-- TASKMANAGEMENT 開発用データベースのテーブル定義(試行)
--
-- 実行のタイミング: PostgreSQL コンテナの「初回の初期化時」だけ。
--   docker-compose.yml で /docker-entrypoint-initdb.d/ に読み取り専用でマウントされ、
--   データ用の名前付きボリュームが空のときにだけ実行される。
--   ボリュームが残っている場合は、再実行されない(テーブルの変更は、別の手順で行う)。
--
-- 基準: docs/database-design.md(users 4 項目、tasks 9 項目、複合ユニーク制約。仮・試行の設定は 7 章)。
-- 下記で「仮」と書いた設定は、試行のための仮の値で、確定ではない(未決定)。

-- ---------------------------------------------------------------
-- users(アカウント)
-- ---------------------------------------------------------------
CREATE TABLE users (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    login_id      varchar(50)  NOT NULL UNIQUE,
    -- 仮: ハッシュの方式が未決定のため、長さ 255 は仮の設定(DB 定義: 方式に合わせる)
    password_hash varchar(255) NOT NULL,
    -- 試行設定: 日時の型は timestamptz(DB 定義の型名は「仮の表記」)
    created_at    timestamptz  NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------
-- tasks(タスク)
-- ---------------------------------------------------------------
CREATE TABLE tasks (
    id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    bigint        NOT NULL REFERENCES users (id),
    title      varchar(100)  NOT NULL,
    memo       varchar(1000),
    due_date   date,
    -- 仮: category の型と長さ(20)は仮の設定。
    --     固定の 4 種類の値は未決定のため、値を限定する CHECK 制約は、まだ付けていない。
    --     (DB 定義の「固定の 4 種類のみ」は確定。値の名前が決まったら、制約を追加する)
    category   varchar(20)   NOT NULL,
    position   integer       NOT NULL,
    -- 試行設定: 日時の型は timestamptz
    created_at timestamptz   NOT NULL DEFAULT now(),
    updated_at timestamptz   NOT NULL DEFAULT now(),

    -- 確定: position は 1 以上
    CONSTRAINT tasks_position_check CHECK (position >= 1),

    -- 確定: (user_id, category, position) の複合ユニーク制約。
    -- 試行: DEFERRABLE INITIALLY IMMEDIATE(検査は 1 つの文の終わり。
    --       必要なら、トランザクション内で SET CONSTRAINTS ... DEFERRED にできる)。
    --       遅延可能にするかの最終判断は、API 設計の段階(未決定)。
    CONSTRAINT tasks_user_category_position_key
        UNIQUE (user_id, category, position)
        DEFERRABLE INITIALLY IMMEDIATE
);
