package runner

import (
	"fmt"
	"strconv"
	"strings"
)

// AssertionRule defines a test to execute against the response
type AssertionRule struct {
	Type     string `json:"type"`     // status_code, response_time, body_contains, header_exists
	Operator string `json:"operator"` // equals, not_equals, less_than, greater_than, contains
	Value    string `json:"value"`    // Expected value
}

// AssertionResult indicates the outcome of an assertion rule
type AssertionResult struct {
	Rule     AssertionRule `json:"rule"`
	Passed   bool          `json:"passed"`
	Actual   string        `json:"actual"`
	Expected string        `json:"expected"`
	Message  string        `json:"message"`
}

// EvaluateAssertions evaluates a list of assertion rules against the actual response
func EvaluateAssertions(rules []AssertionRule, statusCode int, latencyMs int64, headers map[string][]string, body string) []AssertionResult {
	results := make([]AssertionResult, 0, len(rules))

	for _, rule := range rules {
		res := AssertionResult{
			Rule:     rule,
			Expected: rule.Value,
		}

		switch rule.Type {
		case "status_code":
			actualStr := strconv.Itoa(statusCode)
			res.Actual = actualStr

			expectedInt, _ := strconv.Atoi(rule.Value)
			switch rule.Operator {
			case "equals":
				res.Passed = statusCode == expectedInt
				if res.Passed {
					res.Message = fmt.Sprintf("Status code is %d", statusCode)
				} else {
					res.Message = fmt.Sprintf("Expected status %d but got %d", expectedInt, statusCode)
				}
			case "not_equals":
				res.Passed = statusCode != expectedInt
				res.Message = fmt.Sprintf("Status code is not %d", expectedInt)
			case "is_2xx":
				res.Passed = statusCode >= 200 && statusCode < 300
				res.Message = fmt.Sprintf("Status code %d is 2xx success", statusCode)
			default:
				res.Passed = statusCode == expectedInt
			}

		case "response_time":
			res.Actual = fmt.Sprintf("%dms", latencyMs)
			maxMs, _ := strconv.ParseInt(rule.Value, 10, 64)
			switch rule.Operator {
			case "less_than":
				res.Passed = latencyMs < maxMs
				if res.Passed {
					res.Message = fmt.Sprintf("Response time %dms is under %dms", latencyMs, maxMs)
				} else {
					res.Message = fmt.Sprintf("Response time %dms exceeded %dms", latencyMs, maxMs)
				}
			case "greater_than":
				res.Passed = latencyMs > maxMs
				res.Message = fmt.Sprintf("Response time is %dms", latencyMs)
			default:
				res.Passed = latencyMs < maxMs
			}

		case "body_contains":
			res.Passed = strings.Contains(body, rule.Value)
			res.Actual = fmt.Sprintf("Body length: %d chars", len(body))
			if res.Passed {
				res.Message = fmt.Sprintf("Body contains '%s'", rule.Value)
			} else {
				res.Message = fmt.Sprintf("Body does not contain '%s'", rule.Value)
			}

		case "header_exists":
			_, exists := headers[rule.Value]
			if !exists {
				// Case-insensitive check
				for k := range headers {
					if strings.EqualFold(k, rule.Value) {
						exists = true
						break
					}
				}
			}
			res.Passed = exists
			res.Actual = fmt.Sprintf("Header present: %t", exists)
			if res.Passed {
				res.Message = fmt.Sprintf("Header '%s' exists in response", rule.Value)
			} else {
				res.Message = fmt.Sprintf("Header '%s' missing from response", rule.Value)
			}

		default:
			res.Passed = true
			res.Message = "Rule executed"
		}

		results = append(results, res)
	}

	return results
}
