package com.example.taskmanagement.repository;

import com.example.taskmanagement.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

/** users テーブルの Repository(Spring Data JPA)。独自の検索は、必要になった段階で追加する。 */
public interface UserRepository extends JpaRepository<User, Long> {
}
