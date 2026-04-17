package com.smartcampus.service;

import com.smartcampus.dto.ResourceRequest;
import com.smartcampus.dto.ResourceResponse;
import com.smartcampus.exception.ForbiddenException;
import com.smartcampus.exception.ResourceNotFoundException;
import com.smartcampus.model.Resource;
import com.smartcampus.model.User;
import com.smartcampus.model.enums.ResourceStatus;
import com.smartcampus.model.enums.ResourceType;
import com.smartcampus.model.enums.UserRole;
import com.smartcampus.repository.ResourceRepository;
import com.smartcampus.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.List;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class ResourceService {

    private final ResourceRepository resourceRepository;
    private final CurrentUser currentUser;

    private static final Set<String> LECTURER_ONLY_SUBCATEGORIES = Set.of(
            "Computer Labs",
            "Exam Papers (Current / Unreleased)",
            "Marking Schemes & Answer Keys",
            "Confidential Course Materials (Draft Notes / Internal Content)",
            "Student Assessment Records & Grading Sheets",
            "Research Data Sets (Restricted / Ongoing Research)"
    );

    public List<ResourceResponse> getAllResources(ResourceType type, ResourceStatus status,
                                                  String location, Integer minCapacity, String search) {
        Stream<Resource> stream = resourceRepository.findAll().stream();
        User requester = currentUser.get();

        if (type != null) {
            stream = stream.filter(r -> r.getType() == type);
        }
        if (status != null) {
            stream = stream.filter(r -> r.getStatus() == status);
        }
        if (location != null && !location.isBlank()) {
            String loc = location.toLowerCase();
            stream = stream.filter(r -> r.getLocation() != null && r.getLocation().toLowerCase().contains(loc));
        }
        if (minCapacity != null) {
            stream = stream.filter(r -> r.getCapacity() != null && r.getCapacity() >= minCapacity);
        }
        if (search != null && !search.isBlank()) {
            String q = search.toLowerCase();
            stream = stream.filter(r ->
                    (r.getName() != null && r.getName().toLowerCase().contains(q)) ||
                    (r.getDescription() != null && r.getDescription().toLowerCase().contains(q)));
        }

        if (!canViewLecturerOnlyResources(requester)) {
            stream = stream.filter(r -> !isLecturerOnlyResource(r));
        }

        return stream.map(this::toResponse).toList();
    }

    public ResourceResponse getResourceById(Long id) {
        Resource resource = resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource", id));

        if (isLecturerOnlyResource(resource) && !canViewLecturerOnlyResources(currentUser.get())) {
            throw new ForbiddenException("This resource is only visible to academic staff and admins");
        }

        return toResponse(resource);
    }

    @Transactional
    public ResourceResponse createResource(ResourceRequest request) {
        Resource resource = Resource.builder()
                .name(request.getName())
                .type(request.getType())
                .capacity(request.getCapacity())
                .location(request.getLocation())
                .description(request.getDescription())
            .resourceCategory(request.getResourceCategory())
            .resourceSubcategory(request.getResourceSubcategory())
            .contactPerson(request.getContactPerson())
            .contactNumber(request.getContactNumber())
                .availabilityDate(request.getAvailabilityDate())
                .availabilityStart(request.getAvailabilityStart())
                .availabilityEnd(request.getAvailabilityEnd())
                .status(request.getStatus() != null ? request.getStatus() : ResourceStatus.ACTIVE)
                .build();

        return toResponse(resourceRepository.save(resource));
    }

    @Transactional
    public ResourceResponse updateResource(Long id, ResourceRequest request) {
        Resource resource = resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource", id));

        resource.setName(request.getName());
        resource.setType(request.getType());
        resource.setCapacity(request.getCapacity());
        resource.setLocation(request.getLocation());
        resource.setDescription(request.getDescription());
        if (request.getResourceCategory() != null) {
            resource.setResourceCategory(request.getResourceCategory());
        }
        if (request.getResourceSubcategory() != null) {
            resource.setResourceSubcategory(request.getResourceSubcategory());
        }
        if (request.getContactPerson() != null) {
            resource.setContactPerson(request.getContactPerson());
        }
        if (request.getContactNumber() != null) {
            resource.setContactNumber(request.getContactNumber());
        }
        resource.setAvailabilityDate(request.getAvailabilityDate());
        resource.setAvailabilityStart(request.getAvailabilityStart());
        resource.setAvailabilityEnd(request.getAvailabilityEnd());
        if (request.getStatus() != null) {
            resource.setStatus(request.getStatus());
        }

        return toResponse(resourceRepository.save(resource));
    }

    @Transactional
    public void deleteResource(Long id) {
        if (!resourceRepository.existsById(id)) {
            throw new ResourceNotFoundException("Resource", id);
        }
        resourceRepository.deleteById(id);
    }

    public ResourceResponse toResponse(Resource resource) {
        return ResourceResponse.builder()
                .id(resource.getId())
                .name(resource.getName())
                .type(resource.getType())
                .capacity(resource.getCapacity())
                .location(resource.getLocation())
                .description(resource.getDescription())
                .resourceCategory(resource.getResourceCategory())
                .resourceSubcategory(resource.getResourceSubcategory())
                .contactPerson(resource.getContactPerson())
                .contactNumber(resource.getContactNumber())
                .availabilityDate(resource.getAvailabilityDate())
                .availabilityStart(resource.getAvailabilityStart())
                .availabilityEnd(resource.getAvailabilityEnd())
                .status(resource.getStatus())
                .createdAt(resource.getCreatedAt())
                .updatedAt(resource.getUpdatedAt())
                .build();
    }

    private boolean canViewLecturerOnlyResources(User user) {
        return user != null && (user.getRole() == UserRole.LECTURER || user.getRole() == UserRole.ADMIN);
    }

    private boolean isLecturerOnlyResource(Resource resource) {
        String subcategory = resource.getResourceSubcategory();
        if (subcategory == null || subcategory.isBlank()) {
            return false;
        }

        return LECTURER_ONLY_SUBCATEGORIES.stream()
                .anyMatch(allowed -> allowed.equalsIgnoreCase(subcategory.trim()));
    }
}
