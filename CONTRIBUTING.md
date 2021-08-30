<!-- omit in toc -->
# Contributing to Cinny

First off, thanks for taking the time to contribute! ❤️

All types of contributions are encouraged and valued. See the [Table of Contents](#table-of-contents) for different ways to help and details about how this project handles them. Please make sure to read the relevant section before making your contribution. It will make it a lot easier for us maintainers and smooth out the experience for all involved. The community looks forward to your contributions. 🎉

> And if you like the project, but just don't have time to contribute, that's fine. There are other easy ways to support the project and show your appreciation, which we would also be very happy about:
> - Star the project
> - Tweet about it (tag @cinnyapp)
> - Refer this project in your project's readme
> - Mention the project at local meetups and tell your friends/colleagues
> - [Donate to us](https://liberapay.com/ajbura/donate)

<!-- omit in toc -->
## Table of Contents

- [I Have a Question](#i-have-a-question)
- [I Want To Contribute](#i-want-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Your First Code Contribution](#your-first-code-contribution)
- [Styleguides](#styleguides)
  - [Commit Messages](#commit-messages)
  - [Coding conventions](#coding-conventions)

## I Have a Question

Before you ask a question, it is best to search for existing [Issues](https://github.com/ajbura/cinny/issues) that might help you. In case you have found a suitable issue and still need clarification, you can write your question in this issue.

If you then still feel the need to ask a question and need clarification, we recommend the following:

- Ask in our [Matrix room](https://matrix.to/#/#cinny:matrix.org) or [IRC channel](https://web.libera.chat/?channel=#cinny).
- If no one respond in our channel, please open an [Issue](https://github.com/ajbura/cinny/issues/new).
- Provide as much context as you can about what you're running into.
- Provide project and platform versions (nodejs, npm, etc), depending on what seems relevant.

We will then take care of the issue as soon as possible.


## I Want To Contribute

> ### Legal Notice <!-- omit in toc -->
> When contributing to this project, you must agree that you have authored 100% of the content, that you have the necessary rights to the content and that the content you contribute may be provided under the project license.

### Reporting Bugs

<!-- omit in toc -->
#### Before Submitting a Bug Report

A good bug report shouldn't leave others needing to chase you up for more information. Therefore, we ask you to investigate carefully, collect information and describe the issue in detail in your report. Please complete the following steps in advance to help us fix any potential bug as fast as possible.

- Make sure that you are using the latest version.
- Determine if your bug is really a bug and not an error on your side. If you are looking for support, you might want to check [this section](#i-have-a-question)).
- To see if other users have experienced (and potentially already solved) the same issue you are having, check if there is not already a bug report existing for your bug or error in the [bug tracker](https://github.com/ajbura/cinny/issues?q=label%3Abug).
- Collect information about the bug:
  - OS, Platform and Version (Windows, Linux, macOS, x86, ARM)
  - Possibly your input and the output
  - Can you reliably reproduce the issue?

<!-- omit in toc -->
#### How Do I Submit a Good Bug Report?

> You must never report security related issues, vulnerabilities or bugs to the issue tracker, or elsewhere in public. Instead sensitive bugs must be sent by email to <cinnyapp@gmail.com>.

We use GitHub issues to track bugs and errors. If you run into an issue with the project:

- Open an [Issue](https://github.com/ajbura/cinny/issues/new). (Since we can't be sure at this point whether it is a bug or not, we ask you not to talk about a bug yet and not to label the issue.)
- Explain the behavior you would expect and the actual behavior.
- Please provide as much context as possible and describe the *reproduction steps* that someone else can follow to recreate the issue on their own. For good bug reports you should isolate the problem and create a reduced test case.
- Provide the information you collected in the previous section.

Once it's filed:

- The project team will label the issue accordingly.
- A team member will try to reproduce the issue with your provided steps. If there are no reproduction steps or no obvious way to reproduce the issue, the team will ask you for those steps and mark the issue as `needs-repro`. Bugs with the `needs-repro` tag will not be addressed until they are reproduced.
- If the team is able to reproduce the issue, it will be marked `needs-fix`, as well as possibly other tags (such as `critical`), and the issue will be left to be [implemented by someone](#your-first-code-contribution).


### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion for Cinny, **including completely new features and minor improvements to existing functionality**. Following these guidelines will help maintainers and the community to understand your suggestion and find related suggestions.

<!-- omit in toc -->
#### Before Submitting an Enhancement

- Make sure that you are using the latest version.
- Perform a [search](https://github.com/ajbura/cinny/issues) to see if the enhancement has already been suggested. If it has, add a comment to the existing issue instead of opening a new one.
- Find out whether your idea fits with the scope and aims of the project. It's up to you to make a strong case to convince the project's developers of the merits of this feature. Keep in mind that we want features that will be useful to the majority of our users and not just a small subset.

<!-- omit in toc -->
#### How Do I Submit a Good Enhancement Suggestion?

Enhancement suggestions are tracked as [GitHub issues](https://github.com/ajbura/cinny/issues).

- Use a **clear and descriptive title** for the issue to identify the suggestion.
- Provide a **step-by-step description of the suggested enhancement** in as many details as possible.
- **Describe the current behavior** and **explain which behavior you expected to see instead** and why. At this point you can also tell which alternatives do not work for you.
- You may want to **include screenshots and animated GIFs** which help you demonstrate the steps or point out the part which the suggestion is related to. You can use [this tool](https://www.cockos.com/licecap/) to record GIFs on macOS and Windows, and [this tool](https://github.com/colinkeenan/silentcast) on Linux.
- **Explain why this enhancement would be useful** to most Cinny users. You may also want to point out the other projects that solved it better and which could serve as inspiration.

### Your First Code Contribution
Please send a [GitHub Pull Request to cinny](https://github.com/ajbura/cinny/pull/new/master) with a clear list of what you've done (read more about [pull requests](http://help.github.com/pull-requests/)).

When proposing a PR:

- Describe what problem it solves, what side effects come with it.
- Adding some screenshots will help.
- Add some documentation if relevant.
- Add some comments around blocks/functions if relevant.

Some reasons why a PR could be refused:

- PR is not meeting one of the previous points.
- PR is not meeting project goals.
- PR is conflicting with another PR, and the latter is being preferred.
- PR slows down Cinny, or it obviously does too many
  computations for the task being accomplished. It needs to be optimized.
- PR is using copy-n-paste-programming. It needs to be factorized.
- PR contains commented code: remove it.
- PR adds new features or changes the behavior of Cinny without
  having be approved by the current project owners first.
- PR is too big and needs to be splitted in many smaller ones.
- PR contains unnecessary "space/indentations fixes".

If a PR stays in a stale/WIP/POC state for too long, it may be closed
at any time.


## Styleguides
### Commit Messages
Always write a clear log message for your commits. One-line messages are fine for small changes, but bigger changes should look like this:

    $ git commit -m "A brief summary of the commit
    > 
    > A paragraph describing what changed and its impact."

### Coding conventions
We use [ESLint](https://eslint.org/) for clean and stylistically consistent code syntax.