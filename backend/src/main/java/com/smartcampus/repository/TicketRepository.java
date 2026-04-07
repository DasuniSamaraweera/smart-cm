package com.smartcampus.repository;

import com.smartcampus.model.Ticket;
import com.smartcampus.model.enums.TicketPriority;
import com.smartcampus.model.enums.TicketStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {

    @EntityGraph(attributePaths = {"reporter", "assignedTo"})
    Page<Ticket> findByReporterId(Long reporterId, Pageable pageable);

    @EntityGraph(attributePaths = {"reporter", "assignedTo"})
    Page<Ticket> findByAssignedToId(Long assignedToId, Pageable pageable);

    List<Ticket> findByStatus(TicketStatus status);

    @EntityGraph(attributePaths = {"reporter", "assignedTo"})
    @Query("SELECT t FROM Ticket t WHERE "
         + "(:status IS NULL OR t.status = :status) AND "
         + "(:priority IS NULL OR t.priority = :priority) AND "
         + "(:reporterId IS NULL OR t.reporter.id = :reporterId) AND "
         + "(:assignedToId IS NULL OR t.assignedTo.id = :assignedToId)")
    Page<Ticket> findWithFilters(
            @Param("status") TicketStatus status,
            @Param("priority") TicketPriority priority,
            @Param("reporterId") Long reporterId,
            @Param("assignedToId") Long assignedToId,
            Pageable pageable);
}
