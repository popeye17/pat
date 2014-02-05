package experiment

import (
	"errors"
	. "github.com/julz/pat/benchmarker"
	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
	"time"
)

var _ = Describe("ExperimentConfiguration and Sampler", func() {
	Describe("Running an Experiment and Sampling", func() {
		var (
			sampler      *DummySampler
			executor     *DummyExecutor
			config       *RunnableExperiment
			sampleFunc   func(*DummySampler)
			executorFunc func(*DummyExecutor)
			sample1      *Sample
			sample2      *Sample
			worker       Worker
		)

		BeforeEach(func() {
			sample1 = &Sample{}
			sample2 = &Sample{}
			worker = NewWorker()
			executorFactory := func(iterationResults chan IterationResult, benchmarkResults chan BenchmarkResult, errors chan error, workers chan int, quit chan bool, end chan bool) Executable {
				executor = &DummyExecutor{iterationResults, benchmarkResults, workers, errors, executorFunc}
				return executor
			}
			samplerFactory := func(iterationResults chan IterationResult, benchmarkResults chan BenchmarkResult, errors chan error, workers chan int, samples chan *Sample, quit chan bool, end chan bool) Samplable {
				sampler = &DummySampler{samples, iterationResults, benchmarkResults, workers, errors, sampleFunc}
				return sampler
			}
			config = &RunnableExperiment{ExperimentConfiguration{5, 2, 1, 1, worker, "push"}, executorFactory, samplerFactory}
		})

		It("Sends Samples from Sampler to the passed tracker function", func() {
			executorFunc = func(e *DummyExecutor) {}
			sampleFunc = func(s *DummySampler) {
				defer close(s.samples)
				s.samples <- sample1
				s.samples <- sample2
			}

			got := make([]*Sample, 0)
			config.Run(func(samples <-chan *Sample) {
				for s := range samples {
					got = append(got, s)
				}
			})

			Ω(got).Should(HaveLen(2))
		})

		It("Sends IterationResults from Executor to Sampler", func() {
			executorFunc = func(e *DummyExecutor) {
				e.IterationResults <- IterationResult{}
				e.IterationResults <- IterationResult{}
				e.IterationResults <- IterationResult{}
				close(e.IterationResults)
			}

			got := make([]IterationResult, 0)
			sampleFunc = func(s *DummySampler) {
				defer close(s.samples)
				for r := range s.IterationResults {
					got = append(got, r)
				}
			}

			config.Run(func(samples <-chan *Sample) {
				for _ = range samples {
				}
			})
			Ω(got).Should(HaveLen(3))
		})

		It("Sends BenchmarkResults from Executor to the Sampler", func() {
			executorFunc = func(e *DummyExecutor) {
				e.BenchmarkResults <- BenchmarkResult{}
				e.BenchmarkResults <- BenchmarkResult{}
				close(e.BenchmarkResults)
			}

			got := make([]BenchmarkResult, 0)
			sampleFunc = func(s *DummySampler) {
				defer close(s.samples)
				for r := range s.BenchmarkResults {
					got = append(got, r)
				}
			}

			config.Run(func(samples <-chan *Sample) {
				for _ = range samples {
				}
			})
			Ω(got).Should(HaveLen(2))
		})

		It("Sends Worker events from Executor to the Sampler", func() {
			executorFunc = func(e *DummyExecutor) {
				e.Workers <- 2
				e.Workers <- -1
				close(e.Workers)
			}

			got := make([]int, 0)
			sampleFunc = func(s *DummySampler) {
				defer close(s.samples)
				for r := range s.Workers {
					got = append(got, r)
				}
			}

			config.Run(func(samples <-chan *Sample) {
				for _ = range samples {
				}
			})
			Ω(got).Should(Equal([]int{2, -1}))
		})

		It("Sends Error events from Executor to the Sampler", func() {
			executorFunc = func(e *DummyExecutor) {
				e.Errors <- errors.New("Foo")
				close(e.Errors)
			}

			got := make([]error, 0)
			sampleFunc = func(s *DummySampler) {
				defer close(s.samples)
				for r := range s.Errors {
					got = append(got, r)
				}
			}

			config.Run(func(samples <-chan *Sample) {
				for _ = range samples {
				}
			})
			Ω(got).Should(HaveLen(1))
			Ω(got[0].Error()).Should(Equal("Foo"))
		})
	})

	Describe("Executing", func() {
		PIt("Closes the iterationResults channel when the executorFunc has finished", func() {})
		PIt("Runs a given number of times", func() {})
		PIt("Uses the passed worker", func() {})
		PIt("Calculates the final throughput when the executorFunc has finished", func() {})
	})

	Describe("Sampling", func() {
		var (
			iteration chan IterationResult
			results   chan BenchmarkResult
			errors    chan error
			workers   chan int
			quit      chan bool
			ticks     chan float64
			samples   chan *Sample
		)

		BeforeEach(func() {
			iteration = make(chan IterationResult)
			results = make(chan BenchmarkResult)
			errors = make(chan error)
			workers = make(chan int)
			quit = make(chan bool)
			samples = make(chan *Sample)
			ticks = make(chan float64)
			go (&SamplableExperiment{iteration, results, errors, workers, samples, ticks, quit}).Sample()
		})

		It("Calculates the running average", func() {
			go func() { iteration <- IterationResult{2 * time.Second} }()
			go func() { iteration <- IterationResult{4 * time.Second} }()
			go func() { iteration <- IterationResult{6 * time.Second} }()

			Ω((<-samples).Average).Should(Equal(2 * time.Second))
			Ω((<-samples).Average).Should(Equal(3 * time.Second))
			Ω((<-samples).Average).Should(Equal(4 * time.Second))
		})

		It("Closes the samples channel when there are no more iterationResults", func() {
			go func() {
				iteration <- IterationResult{2 * time.Second}
				close(iteration)
			}()

			Ω((<-samples).Average).Should(Equal(2 * time.Second))
			Ω(samples).Should(BeClosed())
			return
		})

		It("Records the BenchmarkResult command for throughput calculations the second it is recieved rounded down", func() {
			go func() {
				results <- BenchmarkResult{Command: "push", StopTime: time.Now()}
			}()

			Ω((<-samples).Throughput.TimedCommands[0]["push"]).Should(Equal(1))
		})

		It("Updates throughput when the timer ticks", func() {
			go func() { ticks <- 1 }()
			Eventually((<-samples).Type).Should(Equal(ThroughputSample))
		})

		It("Calculates the throughput for a command every tick", func() {
			go func() {
				results <- BenchmarkResult{Command: "push"}
				results <- BenchmarkResult{Command: "push"}
				ticks <- 2
				results <- BenchmarkResult{Command: "push"}
				ticks <- 3
				results <- BenchmarkResult{Command: "push"}
				ticks <- 6
			}()

			<-samples // ResultSample
			<-samples // ResultSample
			Ω((<-samples).Throughput.Commands["push"]).Should(BeNumerically("==", 1))
			<-samples // ResultSample
			Ω((<-samples).Throughput.Commands["push"]).Should(BeNumerically("==", 1))
			<-samples // ResultSample
			Ω((<-samples).Throughput.Commands["push"]).Should(BeNumerically("==", 4.0/6.0))
		})

		It("Calculates the total throughput of a workload every tick", func() {
			go func() {
				results <- BenchmarkResult{Command: "login"}
				results <- BenchmarkResult{Command: "push"}
				ticks <- 2
			}()

			<-samples // ResultsSample
			<-samples // ResultsSample
			Ω((<-samples).Throughput.Total).Should(BeNumerically("==", 1))
		})
	})
})

type DummySampler struct {
	samples          chan *Sample
	IterationResults chan IterationResult
	BenchmarkResults chan BenchmarkResult
	Workers          chan int
	Errors           chan error
	sampleFunc       func(*DummySampler)
}

type DummyExecutor struct {
	IterationResults chan IterationResult
	BenchmarkResults chan BenchmarkResult
	Workers          chan int
	Errors           chan error
	executorFunc     func(*DummyExecutor)
}

func (s *DummySampler) Sample() {
	s.sampleFunc(s)
}

func (e *DummyExecutor) Execute() {
	e.executorFunc(e)
}
