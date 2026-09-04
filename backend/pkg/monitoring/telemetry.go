package monitoring

import (
	"math"
	"net/http"
	"sort"
	"time"

	"api-playground-hub/pkg/database"

	"github.com/gin-gonic/gin"
)

// MetricsSummary encapsulates calculated platform telemetry
type MetricsSummary struct {
	TotalRequests   int64              `json:"totalRequests"`
	TotalErrors     int64              `json:"totalErrors"`
	ErrorRate       float64            `json:"errorRate"`
	AvgLatencyMs    int64              `json:"avgLatencyMs"`
	P50LatencyMs    int64              `json:"p50LatencyMs"`
	P95LatencyMs    int64              `json:"p95LatencyMs"`
	P99LatencyMs    int64              `json:"p99LatencyMs"`
	Status2xxCount  int64              `json:"status2xxCount"`
	Status4xxCount  int64              `json:"status4xxCount"`
	Status5xxCount  int64              `json:"status5xxCount"`
	TopEndpoints    []EndpointStat     `json:"topEndpoints"`
	RecentTimeline  []TimelinePoint    `json:"recentTimeline"`
}

type EndpointStat struct {
	Endpoint string `json:"endpoint"`
	Method   string `json:"method"`
	Hits     int64  `json:"hits"`
	AvgMs    int64  `json:"avgMs"`
}

type TimelinePoint struct {
	TimeLabel string  `json:"timeLabel"`
	Requests  int64   `json:"requests"`
	AvgMs     int64   `json:"avgMs"`
	Errors    int64   `json:"errors"`
}

// GetMetricsSummary computes aggregated telemetry for the dashboard
func GetMetricsSummary(c *gin.Context) {
	db := database.GetDB()

	workspaceID := c.Query("workspaceId")
	if workspaceID == "" {
		workspaceID = c.Param("workspaceId")
	}

	var records []database.MetricRecord
	query := db.Order("timestamp desc").Limit(500)
	if workspaceID != "" {
		query = query.Where("workspace_id = ?", workspaceID)
	}
	query.Find(&records)

	if len(records) == 0 {
		c.JSON(http.StatusOK, MetricsSummary{
			TotalRequests:   0,
			TotalErrors:     0,
			ErrorRate:       0,
			AvgLatencyMs:    0,
			P50LatencyMs:    0,
			P95LatencyMs:    0,
			P99LatencyMs:    0,
			Status2xxCount:  0,
			Status4xxCount:  0,
			Status5xxCount:  0,
			TopEndpoints:    []EndpointStat{},
			RecentTimeline:  []TimelinePoint{},
		})
		return
	}

	var totalReq int64 = int64(len(records))
	var totalErr int64 = 0
	var sumLatency int64 = 0
	var s2xx, s4xx, s5xx int64 = 0, 0, 0
	latencies := make([]int64, 0, totalReq)

	endpointMap := make(map[string]*EndpointStat)

	for _, r := range records {
		sumLatency += r.LatencyMs
		latencies = append(latencies, r.LatencyMs)

		if r.IsError || r.StatusCode >= 400 {
			totalErr++
		}

		if r.StatusCode >= 200 && r.StatusCode < 300 {
			s2xx++
		} else if r.StatusCode >= 400 && r.StatusCode < 500 {
			s4xx++
		} else if r.StatusCode >= 500 {
			s5xx++
		}

		key := r.Method + " " + r.Endpoint
		if stat, exists := endpointMap[key]; exists {
			stat.Hits++
			stat.AvgMs = (stat.AvgMs + r.LatencyMs) / 2
		} else {
			endpointMap[key] = &EndpointStat{
				Endpoint: r.Endpoint,
				Method:   r.Method,
				Hits:     1,
				AvgMs:    r.LatencyMs,
			}
		}
	}

	sort.Slice(latencies, func(i, j int) bool {
		return latencies[i] < latencies[j]
	})

	avgLatency := sumLatency / totalReq
	errorRate := math.Round((float64(totalErr)/float64(totalReq)*100)*10) / 10

	p50 := latencies[int(float64(len(latencies))*0.50)]
	p95 := latencies[int(float64(len(latencies))*0.95)]
	p99 := latencies[int(float64(len(latencies))*0.99)]

	// Top 5 endpoints
	var topList []EndpointStat
	for _, stat := range endpointMap {
		topList = append(topList, *stat)
	}
	sort.Slice(topList, func(i, j int) bool {
		return topList[i].Hits > topList[j].Hits
	})
	if len(topList) > 5 {
		topList = topList[:5]
	}

	// Timeline (last 8 data buckets)
	timeline := make([]TimelinePoint, 0, 8)
	now := time.Now()
	for i := 7; i >= 0; i-- {
		tBucket := now.Add(-time.Duration(i*5) * time.Minute)
		label := tBucket.Format("15:04")
		var bReq, bErr, bSumLat int64 = 0, 0, 0

		for _, r := range records {
			diff := tBucket.Sub(r.Timestamp)
			if diff < 0 {
				diff = -diff
			}
			if diff <= 5*time.Minute {
				bReq++
				bSumLat += r.LatencyMs
				if r.IsError {
					bErr++
				}
			}
		}

		var bAvgLat int64 = 0
		if bReq > 0 {
			bAvgLat = bSumLat / bReq
		} else {
			bAvgLat = avgLatency
		}

		timeline = append(timeline, TimelinePoint{
			TimeLabel: label,
			Requests:  bReq,
			AvgMs:     bAvgLat,
			Errors:    bErr,
		})
	}

	c.JSON(http.StatusOK, MetricsSummary{
		TotalRequests:  totalReq,
		TotalErrors:    totalErr,
		ErrorRate:      errorRate,
		AvgLatencyMs:   avgLatency,
		P50LatencyMs:   p50,
		P95LatencyMs:   p95,
		P99LatencyMs:   p99,
		Status2xxCount: s2xx,
		Status4xxCount: s4xx,
		Status5xxCount: s5xx,
		TopEndpoints:   topList,
		RecentTimeline: timeline,
	})
}
