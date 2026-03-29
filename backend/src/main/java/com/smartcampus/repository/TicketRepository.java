package com.smartcampus.repository;

import com.smartcampus.model.Ticket;
import com.smartcampus.model.enums.TicketPriority;
import com.smartcampus.model.enums.TicketStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {

    List<Ticket> findByReporterId(Long reporterId);

    List<Ticket> findByAssignedToId(Long assignedToId);

    List<Ticket> findByStatus(TicketStatus status);

    @Query("SELECT t FROM Ticket t WHERE "
         + "(:status IS NULL OR t.status = :status) AND "
         + "(:priority IS NULL OR t.priority = :priority) AND "
         + "(:reporterId IS NULL OR t.reporter.id = :reporterId) AND "
         + "(:assignedToId IS NULL OR t.assignedTo.id = :assignedToId) "
         + "ORDER BY t.createdAt DESC")
    List<Ticket> findWithFilters(
            @Param("status") TicketStatus status,
            @Param("priority") TicketPriority priority,
            @Param("reporterId") Long reporterId,
            @Param("assignedToId") Long assignedToId);
}
