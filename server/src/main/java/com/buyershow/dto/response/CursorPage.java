package com.buyershow.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CursorPage<T> {
    private List<T> list;
    private String nextCursor;
    private boolean hasMore;
}
