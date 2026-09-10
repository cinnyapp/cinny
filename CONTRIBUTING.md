# Contributing to Cinny

First off, thanks for taking the time to contribute! ❤️

This document describes the process of contributing to Cinny. It is intended
for anyone considering opening an **issue**, **discussion** or **pull request**.
For people who are interested in developing Cinny and technical details behind
it, please check out our ["Developing Cinny"](HACKING.md) document as well.

> And if you like the project, but just don't have time to contribute, that's fine.
> There are other easy ways to support the project and show your
> appreciation, which we would also be very happy about:
>
> - Star the project
> - Tweet about it (tag @cinnyapp)
> - Refer this project in your project's readme
> - Mention the project at local meetups and tell your friends/colleagues
> - [Donate to us](https://cinny.in/#sponsor)

## The Critical Rule

**The most important rule: you must understand your code.** If you can't
explain what your changes do and how they interact with the greater system, do not contribute to this project.

## AI Usage

The Cinny project stictly does not allow any AI generated code. Any pull request containing it will be rejected. **This is very important.**

## Quick Guide

### I'd like to contribute

> ### Legal Notice
>
> When contributing to this project, you must agree that you have authored 100%
> of the content, that you have the necessary rights to the content and that
> the content you contribute may be provided under the project license. You will
> also be asked to [sign the CLA] ([why CLA?]) upon submiting your pull request.

[All issues are actionable](#issues-are-actionable). Pick one and start
working on it. Thank you. If you need help or guidance, comment on the issue.
Issues that are extra friendly to new contributors are tagged with
["contributor friendly"].

["contributor friendly"]: https://github.com/cinnyapp/cinny/issues?q=is%3Aissue%20is%3Aopen%20label%3A%22contributor%20friendly%22
[sign the cla]: https://github.com/cinnyapp/cla
[why CLA?]: https://github.com/cinnyapp/cla#but-why

### I have a bug! / Something isn't working

First, search the issue tracker and discussions for similar issues. Tip: also
search for [closed issues] and [discussions] — your issue might have already
been fixed!

> [!NOTE]
>
> If there is an _open_ issue or discussion that matches your problem,
> **please do not comment on it unless you have valuable insight to add**.
>
> GitHub has a very _noisy_ set of default notification settings which
> sends an email to _every participant_ in an issue/discussion every time
> someone adds a comment. Instead, use the handy upvote button for discussions,
> and/or emoji reactions on both discussions and issues, which are a visible
> yet non-disruptive way to show your support.

If your issue hasn't been reported already, open an ["Issue Triage"] discussion
and make sure to fill in the template **completely**. They are vital for
maintainers to figure out important details about your setup.

> [!WARNING]
>
> A _very_ common mistake is to file a bug report either as a Q&A or a Feature
> Request. **Please don't do this.** Otherwise, maintainers would have to ask
> for your system information again manually, and sometimes they will even ask
> you to create a new discussion because of how few detailed information is
> required for other discussion types compared to Issue Triage.
>
> Because of this, please make sure that you _only_ use the "Issue Triage"
> category for reporting bugs — thank you!

[closed issues]: https://github.com/cinnyapp/cinny/issues?q=is%3Aissue%20state%3Aclosed
[discussions]: https://github.com/cinnyapp/cinny/discussions?discussions_q=is%3Aclosed
["issue triage"]: https://github.com/cinnyapp/cinny/discussions/new?category=issue-triage

### I have an idea for a feature

Like bug reports, first search through both issues and discussions and try to
find if your feature has already been requested. Otherwise, open a discussion
in the ["Feature Requests, Ideas"] category.

["feature requests, ideas"]: https://github.com/cinnyapp/cinny/discussions/new?category=feature-requests-ideas

### I've implemented a feature

1. If there is an issue for the feature, open a pull request straight away.
2. If there is no issue, open a discussion and link to your branch.
3. If you want to live dangerously, open a pull request and
   [hope for the best](#pull-requests-implement-an-issue).

### I have a question which is neither a bug report nor a feature request

Open an [Q&A discussion], or join our [Matrix Space] and ask away in the
`Cinny Support` room.

Do not use other rooms to ask for help as our rooms are mostly specific
topic only. If you do ask a question there, you will be redirected
to `Cinny Support` room instead.

> [!NOTE]
> If your question is about a missing feature, please open a discussion under
> the ["Feature Requests, Ideas"] category. If Cinny is behaving
> unexpectedly, use the ["Issue Triage"] category.
>
> The "Q&A" category is strictly for other kinds of discussions and do not
> require detailed information unlike the two other categories, meaning that
> maintainers would have to spend the extra effort to ask for basic information
> if you submit a bug report under this category.
>
> Therefore, please **pay attention to the category** before opening
> discussions to save us all some time and energy. Thank you!

[q&a discussion]: https://github.com/cinnyapp/cinny/discussions/new?category=q-a
[matrix space]: https://matrix.to/#/#cinny:matrix.org

## General Patterns

### Issues are Actionable

The Cinny [issue tracker](https://github.com/cinnyapp/cinny/issues)
is for _actionable items_.

Unlike some other projects, Cinny **does not use the issue tracker for
discussion or feature requests**. Instead, we use GitHub
[discussions](https://github.com/cinnyapp/cinny/discussions) for that.
Once a discussion reaches a point where a well-understood, actionable
item is identified, it is moved to the issue tracker. **This pattern
makes it easier for maintainers or contributors to find issues to work on
since _every issue_ is ready to be worked on.**

If you are experiencing a bug and have clear steps to reproduce it, please
open an issue. If you are experiencing a bug but you are not sure how to
reproduce it or aren't sure if it's a bug, please open a discussion.
If you have an idea for a feature, please open a discussion.

### Pull Requests Implement an Issue

Pull requests should be associated with a previously accepted issue.
**If you open a pull request for something that wasn't previously discussed,**
it may be closed or remain stale for an indefinite period of time. I'm not
saying it will never be accepted, but the odds are stacked against you.

Issues tagged with "feature" represent accepted, well-scoped feature requests.
If you implement an issue tagged with feature as described in the issue, your
pull request will be accepted with a high degree of certainty.

> [!NOTE]
>
> **Pull requests are NOT a place to discuss feature design.** Please do
> not open a WIP pull request to discuss a feature. Instead, use a discussion
> and link to your branch.
