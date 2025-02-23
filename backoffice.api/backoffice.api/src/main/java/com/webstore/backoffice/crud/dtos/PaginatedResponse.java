package com.webstore.backoffice.crud.dtos;

import java.util.List;

public class PaginatedResponse<T> {
    private List<T> result;
    private long count;
    private int page;
    private int pageSize;
    private int totalPages;

    public PaginatedResponse(List<T> result, long count) {
        this.result = result;
        this.count = count;
    }

    public List<T> getResult() {
        return result;
    }

    public void setResult(List<T> result) {
        this.result = result;
    }

    public long getCount() {
        return count;
    }

    public void setCount(long count) {
        this.count = count;
    }
}

