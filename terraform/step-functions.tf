# ============================================================
# Step Functions — 1 State Machine
# ============================================================

resource "aws_sfn_state_machine" "lambda_ecs" {
  name     = "Step-Function-LambdaECS"
  role_arn = aws_iam_role.step_function_lambda_ecs.arn
  type     = "STANDARD"

  definition = jsonencode({
    Comment = "Step Function to orchestrate Lambda and ECS tasks"
    StartAt = "InvokeLambda"
    States = {
      InvokeLambda = {
        Type     = "Task"
        Resource = "arn:aws:states:::lambda:invoke"
        Parameters = {
          FunctionName = "arn:aws:lambda:eu-central-1:011566070219:function:Lambda_to_stepfunction"
          Payload = {
            "input.$" = "$"
          }
        }
        Next = "Done"
      }
      Done = {
        Type = "Succeed"
      }
    }
  })

  lifecycle {
    ignore_changes = [definition]
  }

  tags = { Name = "Step-Function-LambdaECS" }
}
