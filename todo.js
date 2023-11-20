document.addEventListener('DOMContentLoaded', function() {
  const taskForm = document.getElementById('taskForm');
  const tasksContainer = document.getElementById('tasks');

  // Handle form submission
  taskForm.addEventListener('submit', function(event) {
      event.preventDefault();

      const formData = new FormData(taskForm);
      const taskData = {};
      formData.forEach((value, key) => {
          taskData[key] = value;
      });

      saveTask(taskData);
      displayTasks();
      taskForm.reset(); // Reset the form after submission
  });

  function saveTask(task) {
      let tasks = localStorage.getItem('tasks');
      tasks = tasks ? JSON.parse(tasks) : [];
      tasks.push(task);
      localStorage.setItem('tasks', JSON.stringify(tasks));
  }

  function displayTasks() {
      let tasks = localStorage.getItem('tasks');
      tasks = tasks ? JSON.parse(tasks) : [];

      tasksContainer.innerHTML = ''; // Clear existing tasks

      tasks.forEach((task, index) => {
          const taskElement = document.createElement('li');
          taskElement.textContent = `${task.taskName} - ${task.startDate} to ${task.endDate}`;
          taskElement.setAttribute('data-index', index);
          taskElement.addEventListener('click', function() {
              displayTaskDetails(task);
          });
          tasksContainer.appendChild(taskElement);
      });
  }

  function displayTaskDetails(task) {
      const detailsContainer = document.getElementById('taskDetails');
      detailsContainer.innerHTML = `
          <h3>Task Details</h3>
          <p><strong>Name:</strong> ${task.taskName}</p>
          <p><strong>Description:</strong> ${task.taskDescription}</p>
          <p><strong>Start Date:</strong> ${task.startDate}</p>
          <p><strong>End Date:</strong> ${task.endDate}</p>
          <p><strong>Priority:</strong> ${task.priority}</p>
          <p><strong>Notes:</strong> ${task.additionalNotes || 'None'}</p>
      `;
  }

  // Display tasks on initial load
  displayTasks();
});
