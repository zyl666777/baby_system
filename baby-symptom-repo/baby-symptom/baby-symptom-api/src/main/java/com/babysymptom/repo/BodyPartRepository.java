package com.babysymptom.repo;

import com.babysymptom.domain.BodyPart;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BodyPartRepository extends JpaRepository<BodyPart, String> {
    List<BodyPart> findAllByOrderBySortOrderAsc();
}
