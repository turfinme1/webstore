package com.webstore.backoffice.crud.dtos;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

public class QueryBuildWrapper<T> {
    private final Specification<T> specification;
    private final Sort sort;
    private final PageRequest pageRequest;

    public QueryBuildWrapper(Specification<T> specification, Sort sort, PageRequest pageRequest) {
        this.specification = specification;
        this.sort = sort;
        this.pageRequest = pageRequest;
    }

    public Specification<T> getSpecification() { return specification; }
    public Sort getSort() { return sort; }
    public PageRequest getPageRequest() { return pageRequest; }
}
