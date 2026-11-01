package com.babysymptom.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "body_part")
public class BodyPart {
    @Id
    private String code;
    private String name;
    @Column(name = "sort_order")
    private int sortOrder;

    protected BodyPart() {}

    public String getCode() { return code; }
    public String getName() { return name; }
    public int getSortOrder() { return sortOrder; }
}
