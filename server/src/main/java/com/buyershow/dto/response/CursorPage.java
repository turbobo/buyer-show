package com.buyershow.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class CursorPage<T> {
    private List<T> list;
    private String nextCursor;
    private boolean hasMore;
}
