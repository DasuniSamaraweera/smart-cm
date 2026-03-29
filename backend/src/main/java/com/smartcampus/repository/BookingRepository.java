package com.smartcampus.repository;

import com.smartcampus.model.Booking;
import com.smartcampus.model.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

    List<Booking> findByUserId(Long userId);

    List<Booking> findByResourceId(Long resourceId);

    List<Booking> findByStatus(BookingStatus status);

    @Query("SELECT b FROM Booking b WHERE b.resource.id = :resourceId "
         + "AND b.status = 'APPROVED' "
         + "AND b.startTime < :endTime "
         + "AND b.endTime > :startTime")
    List<Booking> findConflictingBookings(
            @Param("resourceId") Long resourceId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime);

    @Query("SELECT b FROM Booking b WHERE "
         + "(:userId IS NULL OR b.user.id = :userId) AND "
         + "(:resourceId IS NULL OR b.resource.id = :resourceId) AND "
         + "(:status IS NULL OR b.status = :status) "
         + "ORDER BY b.createdAt DESC")
    List<Booking> findWithFilters(
            @Param("userId") Long userId,
            @Param("resourceId") Long resourceId,
            @Param("status") BookingStatus status);
}
