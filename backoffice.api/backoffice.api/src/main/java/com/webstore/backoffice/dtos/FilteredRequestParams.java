package com.webstore.backoffice.dtos;

import java.util.List;
import java.util.Map;

public class FilteredRequestParams {

    private Map<String, Object> filterParams;
    private List<List<String>> orderParams;
    private int pageSize;
    private int page; // page number

    public Map<String, Object> getFilterParams() {
        return filterParams;
    }
    public void setFilterParams(Map<String, Object> filterParams) {
        this.filterParams = filterParams;
    }
    public List<List<String>> getOrderParams() {
        return orderParams;
    }
    public void setOrderParams(List<List<String>> orderParams) {
        this.orderParams = orderParams;
    }
    public int getPageSize() {
        return pageSize;
    }
    public void setPageSize(int pageSize) {
        this.pageSize = pageSize;
    }
    public int getPage() {
        return page;
    }
    public void setPage(int page) {
        this.page = page;
    }
}
