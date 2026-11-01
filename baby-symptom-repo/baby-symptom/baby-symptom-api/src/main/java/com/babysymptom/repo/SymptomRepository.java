package com.babysymptom.repo;

import com.babysymptom.domain.ContentStatus;
import com.babysymptom.domain.Symptom;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SymptomRepository extends JpaRepository<Symptom, Long> {

    @EntityGraph(attributePaths = {"parts"})
    List<Symptom> findByStatusOrderByIdAsc(ContentStatus status);

    @EntityGraph(attributePaths = {"parts"})
    List<Symptom> findAllByOrderByIdAsc();

    boolean existsByCode(String code);

    boolean existsByCodeAndIdNot(String code, Long id);
}
