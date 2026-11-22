package com.example.taskmanagement.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;

/**
 * tasks テーブル(タスク)の Entity。項目は docs/database-design.md の 9 項目に対応する。
 * 講義の Task.java は使わず、既存の DB 定義に合わせて作成した。
 * テーブルと制約(複合ユニーク制約を含む)は、schema.sql で作る(この Entity からは作らない)。
 */
@Entity
@Table(name = "tasks")
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 所有者(users.id を指す外部キー)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "title", nullable = false, length = 100)
    private String title;

    @Column(name = "memo", length = 1000)
    private String memo;

    @Column(name = "due_date")
    private LocalDate dueDate;

    // 仮: 型・長さ(20)は仮の設定。固定の 4 種類の値は未決定のため、値の制限は、まだ行わない
    @Column(name = "category", nullable = false, length = 20)
    private String category;

    @Column(name = "position", nullable = false)
    private Integer position;

    // 試行: 値は DB の既定値(now())に任せる。updated_at の更新方法(競合検知で使う予定)は、後の段階で決める
    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private Instant updatedAt;

    protected Task() {
        // JPA 用
    }

    public Task(User user, String title, String memo, LocalDate dueDate, String category, Integer position) {
        this.user = user;
        this.title = title;
        this.memo = memo;
        this.dueDate = dueDate;
        this.category = category;
        this.position = position;
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public String getTitle() {
        return title;
    }

    public String getMemo() {
        return memo;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public String getCategory() {
        return category;
    }

    public Integer getPosition() {
        return position;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
