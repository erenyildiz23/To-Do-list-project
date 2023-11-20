



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
            taskElement.classList.add('task-item'); // Add a class for easier targeting
            taskElement.setAttribute('data-index', index);
            tasksContainer.appendChild(taskElement);
        });
    }

    // Event delegation for dynamically added tasks
    tasksContainer.addEventListener('click', function(event) {
        // Check if the clicked element is a task
        if (event.target && event.target.matches("li.task-item")) {
            const index = event.target.getAttribute('data-index');
            displayTaskDetails(JSON.parse(localStorage.getItem('tasks'))[index]);
        }
    });

    function displayTaskDetails(task) {
        const detailsContainer = document.getElementById('taskDetails');
        let htmlContent = `
            <h3>Task Details</h3>
            <p><strong>Name:</strong> ${task.taskName}</p>
            <p><strong>Description:</strong> ${task.taskDescription}</p>
            <p><strong>Start Date:</strong> ${formatDateTime(task.startDate)}</p>
            <p><strong>End Date:</strong> ${formatDateTime(task.endDate)}</p>
            <p><strong>Priority:</strong> ${task.priority}</p>
            <p><strong>Notes:</strong> ${task.additionalNotes || 'None'}</p>
        `;
    
        // Assuming 'task.attachedFiles' is an array of file names
        if (task.attachedFiles && task.attachedFiles.length > 0) {
            htmlContent += `<p><strong>Attached Files:</strong> ${task.attachedFiles.join(', ')}</p>`;
        }
    
        detailsContainer.innerHTML = htmlContent;
    }
    
    function formatDateTime(dateTimeStr) {
        const [date, time] = dateTimeStr.split('T');
        return `${date} Time: ${time}`;
    }
    
    // Display tasks on initial load
    displayTasks();
});
