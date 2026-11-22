package com.example.taskmanagement.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * users テーブル(アカウント)の Entity。項目は docs/database-design.md の 4 項目に対応する。
 * テーブル自体は、schema.sql で作る(この Entity からは作らない)。
 */
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "login_id", nullable = false, length = 50, unique = true)
    private String loginId;

    // 仮: 長さ 255 は仮の設定(ハッシュの方式が未決定)
    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    // 試行: 値は DB の既定値(now())に任せる。更新の扱いは、後の段階で決める
    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    protected User() {
        // JPA 用
    }

    public User(String loginId, String passwordHash) {
        this.loginId = loginId;
        this.passwordHash = passwordHash;
    }

    public Long getId() {
        return id;
    }

    public String getLoginId() {
        return loginId;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
