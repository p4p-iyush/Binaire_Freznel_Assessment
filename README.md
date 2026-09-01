# Binaire Freznel Assessment

## Multi-user CSV Queueing System

This project is made as part of the **Binaire Private Limited Javascript Developer Assessment**.

The main purpose of this project is to allow multiple users to upload CSV files, give each file a priority, and process the files using a server-side queue.

---

## Features

* Upload one or multiple CSV files
* Set priority separately for each file
* Two priorities are available:

  * High
  * Low
* High priority files are processed before low priority files when they are waiting in the queue
* Maximum 2 files are processed at the same time
* CSV files can contain integers and decimal numbers
* Supports different CSV row and column sizes
* Uses Node.js Worker Threads for CSV processing
* Calculates the sum of all numbers in the CSV file
* Shows processing progress
* Generates a unique Process ID for every file
* Shows live queue status
* Uses Socket.IO for real-time updates
* Pixel-style user interface

---

## Technologies Used

### Frontend

* HTML
* CSS
* JavaScript
* Tailwind CSS

### Backend

* Node.js
* Express.js
* Socket.IO
* Multer
* Worker Threads

---

## Project Structure

```text
Binaire_Freznel_Assessment/
│
├── server/
│   ├── server.js
│   ├── queue/
│   │   └── QueueManager.js
│   ├── workers/
│   │   └── csvWorker.js
│   └── services/
│       └── CSVProcessor.js
│
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
│
├── uploads/
│
├── package.json
├── .gitignore
└── README.md
```

---

## How It Works

1. User selects CSV files.
2. User selects priority for each file.
3. Files are uploaded to the Node.js server.
4. Server creates a job for every file.
5. Jobs are added to the queue.
6. High priority jobs are selected before low priority jobs.
7. Maximum 2 workers process files at the same time.
8. Worker reads the CSV file and adds all numeric values.
9. Progress is sent back to the server.
10. After processing, the result is marked as completed.
11. Queue status is updated in the frontend.

---

## Queue Example

Suppose the user uploads:

```text
file1.csv → Low
file2.csv → High
file3.csv → Low
file4.csv → High
```

The waiting queue will give priority to:

```text
file2.csv → High
file4.csv → High
file1.csv → Low
file3.csv → Low
```

Only 2 jobs are processed at the same time because the server has a limit of 2 workers.

---

## CSV Processing

The worker reads the CSV file and calculates the total of all numeric values.

For example:

```text
10.5  20.5  30
5     4     10
```

Result:

```text
80
```

The processing is done using Node.js Worker Threads so that large CSV files do not block the main server thread.

---

## Queue Status

The application shows the status of files such as:

```text
File uploading
File uploaded
File added to queue
Waiting for processing
Processing
Completed
```

During processing, the application also shows the Process ID and progress percentage.

---

## Deadlock Prevention

A deadlock can happen when tasks are waiting for resources that are being held by other tasks.

For example:

```text
Job A is waiting for Resource B
Job B is waiting for Resource A
```

Both jobs keep waiting and neither can continue.

In this project, the queue does not allow jobs to hold resources and wait for another job. Each worker processes one job independently and releases the worker after completion.

The server also continues processing the next job if a worker fails.

Because of this design, the queue avoids the common circular waiting situation.

### Possible Deadlock Types

Some common deadlocks are:

* Resource deadlock
* Circular wait
* Mutual exclusion
* Hold and wait

Deadlocks can reduce productivity because jobs can remain stuck, users have to wait longer, and server resources may not be used properly.

---

## Running the Project

First install the dependencies:

```bash
npm install
```

Start the server:

```bash
npm start
```

The application will run on:

```text
http://localhost:3000
```

---

## Testing

I tested the application with CSV files containing numeric values and also tested larger CSV files with thousands of rows.

I also tested:

* Multiple file uploads
* High and low priorities
* Multiple workers
* Large CSV files
* CSV files with decimal values
* Queue status
* Processing result
* Real-time updates

---

## Future Improvements

Some improvements that can be added later:

* Database for storing jobs permanently
* User authentication
* Better error handling
* More worker configuration
* Job cancellation
* Download processed files
* Better monitoring and logging

---

## Author

**Piyush Jain**

This project was created for the Binaire Private Limited Javascript Developer Assessment.
