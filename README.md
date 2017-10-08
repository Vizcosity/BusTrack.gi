# theHop
A re-imagined public transport Utility for Gibraltar.

## The Problem
Gibraltar has been equipped with a functional bus tracking web-application for over a year now. This can be viewed [here](http://track.bus.gi/).

The current state of the web-app can be seen in the screenshots below:

### Route Selection:
![Web App Screenshot](https://i.imgur.com/qBu4161.png)

### Main Route Info Screen:
![Web App Main Route Information Screenshot](https://i.imgur.com/ivvHT1V.png)

As you can see above, the app does its job. It provides relevant information about the current whereabouts of the buses along each of their respective routes. Reading and making sense of this live map, however, requires somehwat extensive know-how of the bus routes and how they operate in Gibraltar. For the tourist that may be spending the day sightseeing - this can be confusing and is not ideal.

Aside from the background-knowledge issue, the user interface does its job, but could be more engaging and less 'clunky'.

## The Proposition 

In my view, however, there are some areas where it could be improved to provide richer, more intuitive information and feedback for both experienced and novice public transport users.

In any application, UI/UX forms a key component of the overall experience. Users want to *feel* what an app can do, they **want** pretty buttons and satisfying design & layouts - because it makes their Monday morning commute that little bit more bearable, and makes them feel like someone cared enough to labour over the most minute details of their experience.

## Design Concept
Bearing the above in mind, I set out to develop a new bus tracking application. The focus of the app would be on providing a rich, intuitive portal to view and plan routes, and incoroproate a set of useful features such as alerts, recurring trips, live tracking and useful information for visiting tourists. In addittion to this, rich timing information would also be included, allowing users to plan trips from their current location, where the app would resolve routes and suggest nearest / fastest stops to wait by - and even compare these to the efficiency of simply walking to their desired destination.

Below are some shots of a design which I believe satisfies some of the goals outlined above:

![theHop App Mockup](https://i.imgur.com/xqgmUM7.jpg)

The shots above are illustrated on some sample smartphones for demonstration. The left design depicts the design language for the app, a set of bold, modern and UI - friendly colours & typefaces to really complement the experience and provide an elegant, clean and satisfying feel throughout.

## Backend Architecture
As a challenge, I decided to only publicly-accessible data from the pre-existing web - app in order to fuel the feature set for my new spinoff. Bearing this in mind, I designed an architecture for my application which is as follows:

![Backend Architecture Design](https://i.imgur.com/ecqG9zm.png)
