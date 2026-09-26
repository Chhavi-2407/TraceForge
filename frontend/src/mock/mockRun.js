export const mockRun = async (onUpdate) => {
  const stages = [
    "Understanding Issue",
    "Retrieving Context",
    "Forming Hypothesis",
    "Planning Fix",
    "Editing Code",
    "Running Tests",
    "Analyzing Failure",
    "Updating Hypothesis",
    "Retrying Tests",
    "Verifying Result",
  ];

  for (let i = 0; i < stages.length; i++) {
    // Stage starts
    onUpdate({
      stage: stages[i],
      step: i + 1,
      status: "running",
    });

    // Wait for 1 second
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Stage completes
    onUpdate({
      stage: stages[i],
      step: i + 1,
      status: "completed",
    });
  }

  // Entire run completed
  onUpdate({
    stage: "Completed",
    step: null,
    status: "success",
  });
};