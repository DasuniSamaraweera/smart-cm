package com.smartcampus.repository;

import com.smartcampus.model.TicketAttachment;
import com.smartcampus.repository.projection.TicketAttachmentMetadataProjection;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TicketAttachmentRepository extends JpaRepository<TicketAttachment, Long> {

    List<TicketAttachment> findByTicketId(Long ticketId);

    @Query("SELECT ta.id AS id, ta.fileName AS fileName, ta.fileType AS fileType, ta.uploadedAt AS uploadedAt "
         + "FROM TicketAttachment ta WHERE ta.ticket.id = :ticketId ORDER BY ta.uploadedAt ASC")
    List<TicketAttachmentMetadataProjection> findMetadataByTicketId(@Param("ticketId") Long ticketId);

    Optional<TicketAttachment> findByIdAndTicketId(Long id, Long ticketId);

    long countByTicketId(Long ticketId);
}
