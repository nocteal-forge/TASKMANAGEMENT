package com.example.taskmanagement.repository;

import com.example.taskmanagement.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;

/** tasks テーブルの Repository(Spring Data JPA)。独自の検索は、API の設計が決まった段階で追加する。 */
public interface TaskRepository extends JpaRepository<Task, Long> {
}
